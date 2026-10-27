import React, { useState, useEffect } from 'react';
import { Wifi, Radio, BarChart3, Info, Eye, EyeOff } from 'lucide-react';
import { AirspaceMap } from './AirspaceMap';

interface WardrivingSummary {
  total_wifi_observations: number;
  unique_wifi_macs: number;
  grid_cells: number;
  band_2_4ghz: number;
  band_5ghz: number;
  upload_batches: number;
}

interface ChannelStat {
  id: number;
  channel: number;
  frequency_band: string;
  network_count: number;
  time_period: string;
  created_at: string;
}

interface GridCell {
  id: number;
  grid_lat: number;
  grid_lon: number;
  network_count: number;
  channel_breakdown: string;
  first_seen: string;
  last_updated: string;
}

export const WardrivingView: React.FC = () => {
  const [summary, setSummary] = useState<WardrivingSummary | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);
  const [heatmapData, setHeatmapData] = useState<GridCell[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false); // OFF by default
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWardrivingData();
  }, []);

  const fetchWardrivingData = async () => {
    setIsLoading(true);
    try {
      // Fetch summary
      const summaryRes = await fetch('/api/wardriving/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // Fetch channel stats
      const channelsRes = await fetch('/api/wardriving/channels');
      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannelStats(channelsData);
      }

      // Fetch heatmap data
      const heatmapRes = await fetch('/api/wardriving/heatmap');
      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json();
        setHeatmapData(heatmapData);
      }
    } catch (err) {
      console.error('Failed to fetch wardriving data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const channels24GHz = channelStats.filter(s => s.frequency_band === '2.4GHz');
  const channels5GHz = channelStats.filter(s => s.frequency_band === '5GHz');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-mono text-purple-400 mb-1">
          <Radio className="w-3.5 h-3.5" />
          <span>WiFi NETWORK DENSITY MAPPING · FREQUENCY ANALYSIS</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Wardriving Layer
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Aggregate WiFi network density and channel distribution. Privacy-focused: no individual SSIDs or precise locations displayed.
        </p>
      </div>

      {isLoading ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-slate-400">Loading wardriving data...</div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-slate-400 uppercase mb-1">Networks</div>
                <div className="text-2xl font-bold text-white">{summary.total_wifi_observations.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">observations</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-slate-400 uppercase mb-1">Unique MACs</div>
                <div className="text-2xl font-bold text-white">{summary.unique_wifi_macs.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">identifiers</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-slate-400 uppercase mb-1">Grid Cells</div>
                <div className="text-2xl font-bold text-white">{summary.grid_cells}</div>
                <div className="text-xs text-slate-500 mt-0.5">~1km res</div>
              </div>

              <div className="bg-slate-900/60 border border-purple-800/50 rounded-xl p-4">
                <div className="text-xs font-mono text-purple-400 uppercase mb-1">2.4 GHz</div>
                <div className="text-2xl font-bold text-white">{summary.band_2_4ghz.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">ch 1-14</div>
              </div>

              <div className="bg-slate-900/60 border border-cyan-800/50 rounded-xl p-4">
                <div className="text-xs font-mono text-cyan-400 uppercase mb-1">5 GHz</div>
                <div className="text-2xl font-bold text-white">{summary.band_5ghz.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-0.5">ch 36-165</div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-slate-400 uppercase mb-1">Uploads</div>
                <div className="text-2xl font-bold text-white">{summary.upload_batches}</div>
                <div className="text-xs text-slate-500 mt-0.5">batches</div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Heatmap */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">Network Density Heatmap</span>
                  </div>
                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      showHeatmap
                        ? 'bg-purple-950/40 border border-purple-800/60 text-purple-400'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {showHeatmap ? 'Hide' : 'Show'} Heatmap
                  </button>
                </div>

                {showHeatmap && heatmapData.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 h-[400px] flex items-center justify-center text-slate-400 text-sm">
                      <div className="text-center space-y-2">
                        <Info className="w-8 h-8 mx-auto text-slate-600" />
                        <p>Heatmap visualization placeholder</p>
                        <p className="text-xs text-slate-500">
                          {heatmapData.length} grid cells with data
                        </p>
                        <p className="text-xs text-slate-500">
                          (Integrate with Leaflet heatmap layer in production)
                        </p>
                      </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-purple-950/20 border border-purple-800/40 rounded-lg p-3 text-xs text-slate-400">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-purple-400">Privacy:</span> Heatmap shows aggregated network density at ~1km resolution. Individual SSIDs, BSSIDs, and precise locations are not displayed.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : !showHeatmap ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
                    Heatmap layer is hidden. Click "Show Heatmap" to display network density.
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-8 text-center text-slate-500 text-sm">
                    No heatmap data available. Import wardriving logs to populate.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Channel Statistics */}
            <div className="lg:col-span-5 space-y-4">
              {/* 2.4 GHz Channels */}
              <div className="bg-slate-900/60 border border-purple-800/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-white">2.4 GHz Band (Channels 1-14)</span>
                </div>

                {channels24GHz.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {channels24GHz.map((stat) => {
                      const maxCount = Math.max(...channels24GHz.map(s => s.network_count));
                      const percentage = (stat.network_count / maxCount) * 100;

                      return (
                        <div key={stat.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-400">Ch {stat.channel}</span>
                            <span className="font-mono font-semibold text-slate-200">{stat.network_count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-sm py-4">
                    No 2.4 GHz data available
                  </div>
                )}
              </div>

              {/* 5 GHz Channels */}
              <div className="bg-slate-900/60 border border-cyan-800/50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">5 GHz Band (Channels 36-165)</span>
                </div>

                {channels5GHz.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {channels5GHz.map((stat) => {
                      const maxCount = Math.max(...channels5GHz.map(s => s.network_count));
                      const percentage = (stat.network_count / maxCount) * 100;

                      return (
                        <div key={stat.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono text-slate-400">Ch {stat.channel}</span>
                            <span className="font-mono font-semibold text-slate-200">{stat.network_count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-sm py-4">
                    No 5 GHz data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
