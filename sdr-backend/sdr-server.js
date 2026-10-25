#!/usr/bin/env node
/**
 * Live SDR Backend Server
 * Provides waterfall spectrum data and audio streaming from RTL-SDR
 * Port: 8082
 */

const express = require('express');
const { spawn, spawnSync } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const PORT = 8082;
const DEFAULT_FREQ = 96.1e6; // 96.1 FM

let currentFreq = DEFAULT_FREQ;
let currentMode = 'wbfm'; // wbfm (FM broadcast), nfm (narrowband FM), am
let rtlFmProcess = null;
let rtlPowerProcess = null;
let audioClients = new Set();
let spectrumClients = new Set();
let isStartingAudio = false; // Prevent overlapping starts

// Calculate demodulation parameters based on mode
function getDemodParams(freq, mode) {
  const freqHz = Math.round(freq);

  switch (mode) {
    case 'wbfm': // FM broadcast (88-108 MHz)
      return {
        freq: freqHz,
        mode: 'wbfm',
        args: [
          '-f', freqHz.toString(),
          '-M', 'wbfm',
          '-s', '200000',  // Sample at 200kHz
          '-r', '200000',   // Output at 200kHz (will be resampled by sox to 48kHz)
          '-l', '0',       // No squelch
          '-g', 'auto',
          '-'
        ],
        sampleRate: 48000  // After sox downsampling
      };
    case 'nfm': // Narrowband FM (ham, NOAA weather)
      return {
        freq: freqHz,
        mode: 'nfm',
        args: [
          '-f', freqHz.toString(),
          '-M', 'fm',      // Use 'fm' instead of 'nfm' for rtl_fm
          '-s', '12000',
          '-r', '12000',
          '-l', '0',
          '-g', 'auto',
          '-'
        ],
        sampleRate: 12000
      };
    case 'am': // AM broadcast
      return {
        freq: freqHz,
        mode: 'am',
        args: [
          '-f', freqHz.toString(),
          '-M', 'am',
          '-s', '12000',
          '-r', '12000',
          '-l', '0',
          '-g', 'auto',
          '-'
        ],
        sampleRate: 12000
      };
    default:
      return getDemodParams(freq, 'wbfm');
  }
}

// Start rtl_fm for audio demodulation
function startAudioStream(freq, mode) {
  // Prevent overlapping starts
  if (isStartingAudio) {
    console.log('Already starting audio, ignoring duplicate request');
    return;
  }

  isStartingAudio = true;

  // Stop rtl_power first - device can only be used by one process
  if (rtlPowerProcess) {
    console.log('Stopping rtl_power to start audio stream');
    rtlPowerProcess.kill();
    rtlPowerProcess = null;
  }

  if (rtlFmProcess) {
    rtlFmProcess.kill();
    rtlFmProcess = null;
  }

  // Kill ALL rtl processes synchronously and wait for device to be free
  console.log('Killing all rtl_* processes...');
  spawnSync('pkill', ['-9', 'rtl_power']);
  spawnSync('pkill', ['-9', 'rtl_fm']);
  spawnSync('pkill', ['-9', 'sox']);

  // Wait 500ms for USB device to be released
  const wait = Date.now() + 500;
  while (Date.now() < wait) { /* busy wait */ }

  console.log('Device should be free now');

  const params = getDemodParams(freq, mode);

  console.log(`Starting rtl_fm: ${params.args.join(' ')}`);

  // For WBFM, use sox to downsample 200kHz → 48kHz in a proper pipeline
  if (mode === 'wbfm') {
    // Start rtl_fm, pipe to sox for resampling
    const rtlFm = spawn('rtl_fm', params.args);
    const sox = spawn('sox', ['-t', 'raw', '-r', '200000', '-e', 's', '-b', '16', '-c', '1', '-', '-t', 'raw', '-r', '48000', '-e', 's', '-b', '16', '-c', '1', '-']);

    // Pipe rtl_fm stdout to sox stdin
    rtlFm.stdout.pipe(sox.stdin);

    // Use sox stdout as the audio source
    rtlFmProcess = sox;

    rtlFm.stderr.on('data', (data) => {
      console.error(`rtl_fm stderr: ${data}`);
    });

    sox.stderr.on('data', (data) => {
      console.error(`sox stderr: ${data}`);
    });

    rtlFm.on('close', (code) => {
      console.log(`rtl_fm subprocess exited with code ${code}`);
      sox.stdin.end();
    });
  } else {
    // NFM: use rtl_fm directly (outputs at 12kHz)
    rtlFmProcess = spawn('rtl_fm', params.args);
  }

  // Clear starting flag after a delay to allow process to start
  setTimeout(() => {
    isStartingAudio = false;
  }, 1000);

  rtlFmProcess.stdout.on('data', (data) => {
    // Broadcast raw audio to all connected clients
    audioClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  rtlFmProcess.stderr.on('data', (data) => {
    console.error(`rtl_fm stderr: ${data}`);
  });

  rtlFmProcess.on('close', (code) => {
    console.log(`rtl_fm process exited with code ${code}`);
    rtlFmProcess = null;
    // Only restart waterfall if audio was explicitly stopped (not if it failed to start)
    if (code === 0 && spectrumClients.size > 0 && !rtlPowerProcess) {
      console.log('Restarting rtl_power after audio stream ended');
      setTimeout(() => startSpectrumStream(), 500);
    }
  });
}

// Start rtl_power for real waterfall spectrum
function startSpectrumStream() {
  if (rtlPowerProcess) {
    rtlPowerProcess.kill();
    rtlPowerProcess = null;
  }

  // Kill any orphan rtl_fm processes before starting spectrum (synchronously)
  try {
    spawnSync('pkill', ['-9', 'rtl_fm']);
    // Wait a bit for USB device to be released
    const wait = Date.now() + 200;
    while (Date.now() < wait) { /* busy wait */ }
  } catch (err) {
    // Ignore errors
  }

  // Calculate frequency range (±250 kHz around center)
  const span = 500000; // 500 kHz total span
  const lowFreq = currentFreq - (span / 2);
  const highFreq = currentFreq + (span / 2);
  const bins = 512;

  const args = [
    '-f', `${lowFreq}:${highFreq}:${Math.floor((highFreq - lowFreq) / bins)}`,
    '-i', '0.1',  // 100ms integration time (10 Hz update rate)
    '-g', 'auto',
    '-'
  ];

  console.log(`Starting rtl_power for waterfall: ${args.join(' ')}`);

  rtlPowerProcess = spawn('rtl_power', args);

  let buffer = '';

  rtlPowerProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    lines.forEach(line => {
      if (line.trim().length === 0) return;

      // Parse rtl_power CSV output
      // Format: date, time, Hz low, Hz high, Hz step, samples, dB, dB, dB, ...
      const parts = line.split(',').map(s => s.trim());
      if (parts.length < 7) return;

      const powerValues = parts.slice(6).map(parseFloat);

      // Send to all spectrum clients
      spectrumClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'spectrum',
            frequency: currentFreq,
            bandwidth: span,
            data: powerValues
          }));
        }
      });
    });
  });

  rtlPowerProcess.stderr.on('data', (data) => {
    console.error(`rtl_power stderr: ${data}`);
  });

  rtlPowerProcess.on('close', (code) => {
    console.log(`rtl_power process exited with code ${code}`);
    rtlPowerProcess = null;
  });
}

// WebSocket handling
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const type = url.searchParams.get('type');

  console.log(`WebSocket connected: type=${type}`);

  if (type === 'audio') {
    audioClients.add(ws);
  } else if (type === 'spectrum') {
    spectrumClients.add(ws);
    // Start rtl_power when first spectrum client connects
    if (spectrumClients.size === 1 && !rtlPowerProcess) {
      startSpectrumStream();
    }
  }

  ws.on('close', () => {
    audioClients.delete(ws);
    spectrumClients.delete(ws);
    console.log(`WebSocket disconnected: type=${type}`);

    // Stop rtl_power when last spectrum client disconnects
    if (type === 'spectrum' && spectrumClients.size === 0 && rtlPowerProcess) {
      rtlPowerProcess.kill();
      rtlPowerProcess = null;
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// REST API endpoints

// Get current tuning info
app.get('/api/status', (req, res) => {
  res.json({
    frequency: currentFreq,
    mode: currentMode,
    clients: {
      audio: audioClients.size,
      spectrum: spectrumClients.size
    },
    streaming: rtlFmProcess !== null
  });
});

// Tune to frequency
app.post('/api/tune', (req, res) => {
  const { frequency, mode } = req.body;

  if (!frequency || frequency < 24e6 || frequency > 1766e6) {
    return res.status(400).json({ error: 'Invalid frequency (24-1766 MHz)' });
  }

  currentFreq = frequency;
  currentMode = mode || 'wbfm';

  console.log(`Tuning to ${(frequency / 1e6).toFixed(3)} MHz (${currentMode})`);

  // Restart audio stream with new frequency if streaming
  if (rtlFmProcess) {
    startAudioStream(currentFreq, currentMode);
  }

  // Restart spectrum stream if running
  if (rtlPowerProcess) {
    startSpectrumStream();
  }

  res.json({
    success: true,
    frequency: currentFreq,
    mode: currentMode
  });
});

// Start streaming
app.post('/api/start', (req, res) => {
  console.log('Start streaming requested');
  startAudioStream(currentFreq, currentMode);
  res.json({ success: true });
});

// Stop streaming
app.post('/api/stop', (req, res) => {
  console.log('Stop streaming requested');
  if (rtlFmProcess) {
    rtlFmProcess.kill();
    rtlFmProcess = null;
  }
  // Restart waterfall after audio stops if clients connected
  if (spectrumClients.size > 0 && !rtlPowerProcess) {
    console.log('Restarting rtl_power after stopping audio');
    setTimeout(() => startSpectrumStream(), 500);
  }
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// Cleanup on exit
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  if (rtlFmProcess) rtlFmProcess.kill();
  if (rtlPowerProcess) rtlPowerProcess.kill();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (rtlFmProcess) rtlFmProcess.kill();
  if (rtlPowerProcess) rtlPowerProcess.kill();
  server.close();
  process.exit(0);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SDR Backend listening on port ${PORT}`);
  console.log(`Audio stream: ws://localhost:${PORT}?type=audio`);
  console.log(`Spectrum stream: ws://localhost:${PORT}?type=spectrum`);
});
