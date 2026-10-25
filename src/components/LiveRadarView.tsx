import React, { useState } from 'react';
import { Plane, Search, Compass, Gauge, Radio, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Aircraft } from '../types';
import { AirspaceMap } from './AirspaceMap';

interface LiveRadarViewProps {
  aircraft: Aircraft[];
  onSelectForRewind?: (flight: Aircraft) => void;
}

export const LiveRadarView: React.FC<LiveRadarViewProps> = ({
  aircraft,
  onSelectForRewind,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'adsb' | 'api'>('all');
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(
    aircraft.length > 0 ? aircraft[0] : null
  );

  const filteredAircraft = aircraft.filter((ac) => {
    const matchesSearch =
      ac.callsign.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ac.hex.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ac.aircraft_type && ac.aircraft_type.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource =
      sourceFilter === 'all'
        ? true
        : sourceFilter === 'adsb'
        ? ac.sources.includes('adsb')
        : ac.sources.includes('api');

    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6">
      {/* Top telemetry banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>OMAHA SECTOR AIRSPACE · 1090 MHz ADS-B & OPEN SKY NETWORK</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Live Airspace Surveillance
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time multi-source correlation covering Omaha Metro, Eppley (OMA), Offutt AFB (OFF), and Eastern Nebraska corridor.
          </p>
        </div>

        {/* Telemetry quick metrics */}
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2">
            <div className="text-[11px] font-mono uppercase text-slate-400">Total Tracked</div>
            <div className="text-xl font-mono font-bold text-white tabular-nums">
              {aircraft.length}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2">
            <div className="text-[11px] font-mono uppercase text-cyan-400">ADS-B Direct</div>
            <div className="text-xl font-mono font-bold text-cyan-400 tabular-nums">
              {aircraft.filter((a) => a.sources.includes('adsb')).length}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2">
            <div className="text-[11px] font-mono uppercase text-amber-400">API Gaps</div>
            <div className="text-xl font-mono font-bold text-amber-400 tabular-nums">
              {aircraft.filter((a) => a.sources.includes('api')).length}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-column split: Airspace Map (65%) & Flight Directory (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-8 space-y-4">
          <AirspaceMap
            aircraft={filteredAircraft}
            selectedAircraft={selectedAircraft}
            onSelectAircraft={(ac) => setSelectedAircraft(ac)}
            heightClass="h-[520px] sm:h-[580px]"
          />

          {/* Active flight detail inspection drawer (if an aircraft is selected) */}
          {selectedAircraft && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Plane className="w-5 h-5 transform -rotate-45" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white tracking-tight">
                        {selectedAircraft.callsign || selectedAircraft.hex}
                      </span>
                      {selectedAircraft.sources.includes('adsb') && (
                        <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                          ADS-B
                        </span>
                      )}
                      {selectedAircraft.sources.includes('api') && (
                        <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                          API
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      ICAO: {selectedAircraft.hex} · REG: {selectedAircraft.registration || 'N/A'}
                    </div>
                  </div>
                </div>

                {onSelectForRewind && (
                  <button
                    onClick={() => onSelectForRewind(selectedAircraft)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                  >
                    <span>Check Against Reports</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Telemetry data grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ALTITUDE</span>
                  </div>
                  <div className="text-base sm:text-lg font-mono font-semibold text-white tabular-nums">
                    {selectedAircraft.altitude
                      ? `${selectedAircraft.altitude.toLocaleString()} FT`
                      : 'GROUND'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5 text-cyan-400" />
                    <span>GROUND SPEED</span>
                  </div>
                  <div className="text-base sm:text-lg font-mono font-semibold text-white tabular-nums">
                    {selectedAircraft.ground_speed
                      ? `${Math.round(selectedAircraft.ground_speed)} KTS`
                      : 'N/A'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TRACK / HEADING</span>
                  </div>
                  <div className="text-base sm:text-lg font-mono font-semibold text-white tabular-nums">
                    {selectedAircraft.track !== undefined ? `${selectedAircraft.track}°` : 'N/A'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SQUAWK</span>
                  </div>
                  <div className="text-base sm:text-lg font-mono font-semibold text-white tabular-nums">
                    {selectedAircraft.squawk || '1200 VFR'}
                  </div>
                </div>
              </div>

              {/* Route & Aircraft Type */}
              {(selectedAircraft.origin || selectedAircraft.aircraft_type) && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <span>Type: <strong className="text-slate-200">{selectedAircraft.aircraft_type || 'Civil / Commercial'}</strong></span>
                  {selectedAircraft.origin && (
                    <span>Route: <strong className="text-slate-200">{selectedAircraft.origin} → {selectedAircraft.destination || 'OMA'}</strong></span>
                  )}
                  <span>Position: <strong className="text-slate-200 font-mono tabular-nums">{selectedAircraft.lat.toFixed(4)}°N, {selectedAircraft.lon.toFixed(4)}°W</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Searchable Flight Directory */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col h-[520px] sm:h-[680px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-white text-base">Active Flights</h3>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {filteredAircraft.length} visible
            </span>
          </div>

          {/* Search bar */}
          <div className="relative my-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search callsign, ICAO, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Source Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800/80 rounded-lg mb-3">
            <button
              onClick={() => setSourceFilter('all')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sourceFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({aircraft.length})
            </button>
            <button
              onClick={() => setSourceFilter('adsb')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sourceFilter === 'adsb'
                  ? 'bg-cyan-950/80 border border-cyan-800/60 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ADS-B
            </button>
            <button
              onClick={() => setSourceFilter('api')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sourceFilter === 'api'
                  ? 'bg-amber-950/80 border border-amber-800/60 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              API Only
            </button>
          </div>

          {/* Flight List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredAircraft.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No flights matching your search filter in Omaha airspace.
              </div>
            ) : (
              filteredAircraft.map((ac) => {
                const isSelected = selectedAircraft?.hex === ac.hex;
                const isDual = ac.sources.includes('adsb') && ac.sources.includes('api');
                const isAdsb = ac.sources.includes('adsb');

                return (
                  <button
                    key={ac.hex}
                    onClick={() => setSelectedAircraft(ac)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-100">
                        {ac.callsign || ac.hex}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                          isDual
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : isAdsb
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                            : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {isDual ? 'ADS-B+API' : isAdsb ? 'ADS-B' : 'API'}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-400 flex items-center justify-between tabular-nums">
                      <span>{ac.altitude ? `${ac.altitude.toLocaleString()} ft` : 'Ground'}</span>
                      <span>{ac.ground_speed ? `${Math.round(ac.ground_speed)} kts` : 'N/A'}</span>
                      <span>{ac.track !== undefined ? `${ac.track}°` : '—'}</span>
                    </div>

                    {ac.aircraft_type && (
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        {ac.aircraft_type}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
