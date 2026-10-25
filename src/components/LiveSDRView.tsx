import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Pause, Volume2, Radio as RadioIcon } from 'lucide-react';

interface LiveSDRViewProps {
  onOpenReportModal: () => void;
}

interface Preset {
  name: string;
  frequency: number; // MHz
  mode: 'FM' | 'AM' | 'NFM';
  description: string;
}

const PRESETS: Preset[] = [
  { name: 'FM 96.1', frequency: 96.1, mode: 'FM', description: 'Classic Rock KXKT' },
  { name: 'FM 89.7', frequency: 89.7, mode: 'FM', description: 'NPR KVNO' },
  { name: 'NOAA Weather', frequency: 162.400, mode: 'NFM', description: 'NOAA Weather Radio' },
  { name: 'Ham 146.940', frequency: 146.940, mode: 'NFM', description: 'W0RIC Repeater' },
];

export const LiveSDRView: React.FC<LiveSDRViewProps> = ({ onOpenReportModal }) => {
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [customFrequency, setCustomFrequency] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize waterfall visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Draw initial waterfall background
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw frequency scale
    drawFrequencyScale(ctx, canvas.width, selectedPreset?.frequency || 100);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedPreset]);

  const drawFrequencyScale = (ctx: CanvasRenderingContext2D, width: number, centerFreq: number) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, 20);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const span = 0.5; // MHz
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * width;
      const freq = centerFreq - span / 2 + (i / 10) * span;
      ctx.fillText(freq.toFixed(3), x, 14);
    }
  };

  const handleTune = async (preset: Preset) => {
    setSelectedPreset(preset);
    setIsPlaying(false);

    // In a real implementation, this would call the SDR backend
    // For now, it's a UI-only placeholder
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
      mode: freq > 100 ? 'FM' : 'NFM',
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
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } else {
      // Start playback - in real implementation, connect to SDR stream
      setIsPlaying(true);

      // Initialize Web Audio API for future audio streaming
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }
    }
  };

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
          <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded">24-1766 MHz</span>
        </div>
      </div>

      {/* Status Notice */}
      <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Radio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-medium">SDR Server Waiting for Configuration</p>
            <p className="text-amber-200/70 mt-1">
              RTL-SDR dongle detected. Waterfall and audio streaming will be available once the SDR backend is configured on port 8082.
              VHF antenna connection recommended for best reception.
            </p>
          </div>
        </div>
      </div>

      {/* Waterfall Display */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] bg-slate-950"
        />
      </div>

      {/* Frequency Presets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.frequency}
            onClick={() => handleTune(preset)}
            className={`p-4 rounded-xl border transition-all ${
              selectedPreset?.frequency === preset.frequency
                ? 'bg-cyan-950/60 border-cyan-700 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/40 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-white">{preset.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {preset.mode}
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
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-600 focus:outline-none focus:ring-1 focus:ring-cyan-600 font-mono"
          />
          <button
            onClick={handleCustomTune}
            className="px-6 py-2.5 bg-cyan-950 border border-cyan-800 rounded-lg text-cyan-300 hover:bg-cyan-900 transition-colors font-medium"
          >
            Tune
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Range: 24-1766 MHz • VHF/UHF bands</p>
      </div>

      {/* Playback Controls */}
      {selectedPreset && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400">Now Tuned</div>
              <div className="text-xl font-bold text-white">{selectedPreset.name}</div>
              <div className="text-sm text-cyan-400 font-mono">
                {selectedPreset.frequency.toFixed(3)} MHz • {selectedPreset.mode}
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
            <strong className="text-slate-300">RTL-SDR Blog V4L</strong> • Direct sampling mode available •
            Bias-T disabled
          </p>
          <p>
            <strong className="text-slate-300">Antenna:</strong> VHF 3ft whip (pending connection) •
            Best for: FM broadcast, NOAA weather, amateur radio
          </p>
          <p className="text-amber-400/70 mt-2">
            ⚠️ Audio playback requires user interaction (click Play). Never autoplays on page load.
          </p>
        </div>
      </div>
    </div>
  );
};
