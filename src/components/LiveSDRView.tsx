import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Pause, Volume2, Radio as RadioIcon } from 'lucide-react';

interface LiveSDRViewProps {
  onOpenReportModal: () => void;
}

interface Preset {
  name: string;
  frequency: number; // MHz
  mode: 'wbfm' | 'nfm' | 'am';
  description: string;
}

const PRESETS: Preset[] = [
  { name: 'FM 96.1', frequency: 96.1, mode: 'wbfm', description: 'Classic Rock KXKT' },
  { name: 'FM 89.7', frequency: 89.7, mode: 'wbfm', description: 'NPR KVNO' },
  { name: 'NOAA Weather', frequency: 162.400, mode: 'nfm', description: 'NOAA Weather Radio' },
  { name: 'Ham 146.940', frequency: 146.940, mode: 'nfm', description: 'W0RIC Repeater' },
];

const SDR_BACKEND = '/api/sdr';
const SDR_WS = window.location.protocol === 'https:'
  ? 'wss://' + window.location.host + '/sdr-ws'
  : 'ws://localhost:3000/sdr-ws';

export const LiveSDRView: React.FC<LiveSDRViewProps> = ({ onOpenReportModal }) => {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [customFrequency, setCustomFrequency] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [fineTuneOffset, setFineTuneOffset] = useState(0); // kHz offset for fine tuning

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const spectrumWsRef = useRef<WebSocket | null>(null);
  const audioWsRef = useRef<WebSocket | null>(null);
  const waterfallDataRef = useRef<number[][]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isProcessingAudioRef = useRef(false);

  // Check backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${SDR_BACKEND}/health`);
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize waterfall canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawFrequencyScale(ctx, canvas.width, selectedPreset?.frequency || 100);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedPreset]);

  // Connect to spectrum WebSocket
  useEffect(() => {
    if (backendStatus !== 'online') return;

    const ws = new WebSocket(`${SDR_WS}?type=spectrum`);
    spectrumWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'spectrum' && data.data) {
          updateWaterfall(data.data);
        }
      } catch (err) {
        console.error('Spectrum data parse error:', err);
      }
    };

    ws.onerror = (err) => console.error('Spectrum WebSocket error:', err);
    ws.onclose = () => console.log('Spectrum WebSocket closed');

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [backendStatus]);

  const drawFrequencyScale = (ctx: CanvasRenderingContext2D, width: number, centerFreq: number) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, 20);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const span = 0.25; // MHz visible span
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const freq = centerFreq - span / 2 + (i / 10) * span;
      ctx.fillText(freq.toFixed(3), x, 14);
    }
  };

  const updateWaterfall = (spectrumData: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Add new line to waterfall
    waterfallDataRef.current.unshift(spectrumData);
    if (waterfallDataRef.current.length > canvas.height - 20) {
      waterfallDataRef.current.pop();
    }

    // Draw waterfall
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 20, canvas.width, canvas.height - 20);

    const binWidth = canvas.width / spectrumData.length;

    waterfallDataRef.current.forEach((line, y) => {
      line.forEach((power, x) => {
        const intensity = Math.max(0, Math.min(255, ((power + 90) / 60) * 255));
        ctx.fillStyle = `rgb(${intensity}, ${intensity * 0.5}, ${intensity * 0.3})`;
        ctx.fillRect(x * binWidth, y + 20, binWidth, 1);
      });
    });

    // Redraw frequency scale
    drawFrequencyScale(ctx, canvas.width, selectedPreset?.frequency || 100);
  };

  const processAudioQueue = async () => {
    // Don't check isPlaying here - it's async state and may not be updated yet
    // We only call this function when we want audio to play
    if (!audioContextRef.current || !gainNodeRef.current) {
      return;
    }
    if (audioQueueRef.current.length === 0) {
      // No data yet, try again soon
      setTimeout(() => processAudioQueue(), 50);
      return;
    }

    const pcmData = audioQueueRef.current.shift();
    if (!pcmData || pcmData.length === 0) {
      setTimeout(() => processAudioQueue(), 50);
      return;
    }

    try {
      // Create AudioBuffer from PCM int16 data
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        pcmData.length,
        audioContextRef.current.sampleRate
      );

      const channelData = audioBuffer.getChannelData(0);

      // Convert int16 to float32 [-1.0, 1.0]
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      // Create buffer source and play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(gainNodeRef.current);
      source.start();

      // Continue processing next chunk when this one ends
      source.onended = () => {
        // Keep processing while we have an audio context (means we're playing)
        if (audioContextRef.current && gainNodeRef.current) {
          processAudioQueue();
        }
      };

    } catch (err) {
      console.error('Audio processing error:', err);
      // Try again
      setTimeout(() => processAudioQueue(), 100);
    }
  };

  const handleTune = async (preset: Preset, offsetKHz: number = 0) => {
    setSelectedPreset(preset);
    setFineTuneOffset(offsetKHz);
    setIsPlaying(false);

    // Stop any existing audio
    if (audioWsRef.current) {
      audioWsRef.current.close();
      audioWsRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];

    try {
      // Apply fine tune offset (convert kHz to Hz)
      const adjustedFreq = (preset.frequency * 1e6) + (offsetKHz * 1000);

      const response = await fetch(`${SDR_BACKEND}/tune`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency: adjustedFreq,
          mode: preset.mode
        })
      });

      if (!response.ok) {
        console.error('Tune failed:', await response.text());
      }
    } catch (err) {
      console.error('Tune error:', err);
    }
  };

  const handleFineTune = async (offsetKHz: number) => {
    if (selectedPreset) {
      const wasPlaying = isPlaying;
      await handleTune(selectedPreset, offsetKHz);

      // If audio was playing, restart it after retune
      if (wasPlaying) {
        setTimeout(async () => {
          try {
            await fetch(`${SDR_BACKEND}/start`, { method: 'POST' });
            setIsPlaying(true);

            // Reconnect audio WebSocket
            const sampleRate = selectedPreset.mode === 'wbfm' ? 48000 : 12000;
            audioContextRef.current = new AudioContext({ sampleRate });
            gainNodeRef.current = audioContextRef.current.createGain();
            gainNodeRef.current.gain.value = volume / 100;
            gainNodeRef.current.connect(audioContextRef.current.destination);

            audioWsRef.current = new WebSocket(`${SDR_WS}?type=audio`);
            audioWsRef.current.binaryType = 'arraybuffer';

            audioWsRef.current.onmessage = (event) => {
              if (event.data instanceof ArrayBuffer) {
                const pcmData = new Int16Array(event.data);
                if (audioQueueRef.current.length < 5) {
                  audioQueueRef.current.push(pcmData);
                }
              }
            };

            processAudioQueue();
          } catch (err) {
            console.error('Failed to restart audio after tune:', err);
          }
        }, 500);
      }
    }
  };

  const handleCustomTune = () => {
    const freq = parseFloat(customFrequency);
    if (isNaN(freq) || freq < 24 || freq > 1766) {
      alert('Invalid frequency. Range: 24-1766 MHz');
      return;
    }

    const customPreset: Preset = {
      name: 'Custom',
      frequency: freq,
      mode: freq >= 88 && freq <= 108 ? 'wbfm' : 'nfm',
      description: `${freq.toFixed(3)} MHz`,
    };

    handleTune(customPreset);
  };

  const togglePlayback = async () => {
    if (!selectedPreset) {
      alert('Please select a frequency first');
      return;
    }

    if (isPlaying) {
      // Stop playback
      setIsPlaying(false);

      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (audioWsRef.current) {
        audioWsRef.current.close();
        audioWsRef.current = null;
      }

      audioQueueRef.current = [];
      isProcessingAudioRef.current = false;

      try {
        await fetch(`${SDR_BACKEND}/stop`, { method: 'POST' });
      } catch (err) {
        console.error('Stop error:', err);
      }
    } else {
      // Start playback
      setIsPlaying(true);

      try {
        // Start SDR streaming
        await fetch(`${SDR_BACKEND}/start`, { method: 'POST' });

        // Initialize Web Audio API with appropriate sample rate
        // WBFM downsampled to 48kHz via sox, NFM at 12kHz
        const sampleRate = selectedPreset.mode === 'wbfm' ? 48000 : 12000;
        audioContextRef.current = new AudioContext({ sampleRate });
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = volume / 100;
        gainNodeRef.current.connect(audioContextRef.current.destination);

        // Connect to audio WebSocket
        audioWsRef.current = new WebSocket(`${SDR_WS}?type=audio`);
        audioWsRef.current.binaryType = 'arraybuffer';

        audioWsRef.current.onopen = () => {
          console.log('Audio stream connected');
        };

        audioWsRef.current.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Convert ArrayBuffer to Int16Array (PCM signed 16-bit)
            const pcmData = new Int16Array(event.data);

            // Keep queue from growing too large (max 5 chunks)
            if (audioQueueRef.current.length < 5) {
              audioQueueRef.current.push(pcmData);
            }
          }
        };

        // Start processing audio queue
        processAudioQueue();

        audioWsRef.current.onerror = (err) => {
          console.error('Audio WebSocket error:', err);
          setIsPlaying(false);
        };

        audioWsRef.current.onclose = () => {
          console.log('Audio stream closed');
        };

      } catch (err) {
        console.error('Playback start error:', err);
        setIsPlaying(false);
      }
    }
  };

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center">
            <RadioIcon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Live SDR</h1>
            <p className="text-sm text-slate-400">RTL-SDR Blog V4L • VHF/UHF Receiver</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className={`px-2 py-1 rounded border ${
            backendStatus === 'online'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : backendStatus === 'offline'
              ? 'bg-red-950/40 border-red-800 text-red-300'
              : 'bg-slate-900 border-slate-700'
          }`}>
            {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking...'}
          </span>
          <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded">24-1766 MHz</span>
        </div>
      </div>

      {/* Status Notice */}
      {backendStatus === 'offline' && (
        <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-300 font-medium">SDR Backend Offline</p>
              <p className="text-amber-200/70 mt-1">
                The SDR streaming server is not responding. Please check that the service is running on port 8082.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Waterfall Display */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] bg-slate-950"
        />
        {/* Fine Tuning Slider */}
        {selectedPreset && (
          <div className="p-3 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono shrink-0">Fine Tune:</span>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={fineTuneOffset}
                onChange={(e) => handleFineTune(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
              />
              <span className="text-xs font-mono text-slate-400 w-20 text-right">
                {fineTuneOffset > 0 ? '+' : ''}{fineTuneOffset} kHz
              </span>
              <button
                onClick={() => handleFineTune(0)}
                className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="text-xs text-slate-500 mt-1.5 text-center font-mono">
              {selectedPreset.frequency.toFixed(3)} MHz {fineTuneOffset !== 0 ? `(${(selectedPreset.frequency + fineTuneOffset / 1000).toFixed(6)} MHz)` : ''}
            </div>
          </div>
        )}
      </div>

      {/* Frequency Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.frequency}
            onClick={() => handleTune(preset)}
            disabled={backendStatus !== 'online'}
            className={`p-4 rounded-xl border transition-all ${
              selectedPreset?.frequency === preset.frequency
                ? 'bg-cyan-950/60 border-cyan-700 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-white">{preset.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {preset.mode.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-cyan-400 font-mono mb-1">
                {preset.frequency.toFixed(3)} MHz
              </div>
              <div className="text-xs text-slate-400">{preset.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom Frequency Tuning */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Custom Frequency</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={customFrequency}
            onChange={(e) => setCustomFrequency(e.target.value)}
            placeholder="Enter frequency (MHz)"
            disabled={backendStatus !== 'online'}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleCustomTune}
            disabled={backendStatus !== 'online'}
            className="px-6 py-2.5 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-300 hover:bg-cyan-900 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tune
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Range: 24-1766 MHz • VHF/UHF bands</p>
      </div>

      {/* Playback Controls */}
      {selectedPreset && backendStatus === 'online' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400">Now Tuned</div>
              <div className="text-xl font-bold text-white">{selectedPreset.name}</div>
              <div className="text-sm text-cyan-400 font-mono">
                {selectedPreset.frequency.toFixed(3)} MHz • {selectedPreset.mode.toUpperCase()}
              </div>
            </div>
            <button
              onClick={togglePlayback}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300'
              }`}
            >
              {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-slate-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500"
            />
            <span className="text-sm font-mono text-slate-400 w-12 text-right">{volume}%</span>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <div className="text-xs text-slate-400 space-y-1">
          <p>
            <strong className="text-slate-300">RTL-SDR Blog V4L</strong> • Rafael Micro R820T tuner •
            Real-time audio demodulation
          </p>
          <p>
            <strong className="text-slate-300">Audio:</strong> User-gesture playback required • Never autoplays
          </p>
          <p className="text-cyan-400/70 mt-2">
            ✓ Real PCM audio streaming • Click Play to hear live radio
          </p>
        </div>
      </div>
    </div>
  );
};
