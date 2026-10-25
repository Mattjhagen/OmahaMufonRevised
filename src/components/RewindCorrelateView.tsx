import React, { useState, useMemo } from 'react';
import { RotateCcw, Clock, AlertCircle, CheckCircle2, ChevronRight, Sliders, MapPin, Compass } from 'lucide-react';
import { Aircraft, SightingReport } from '../types';
import { AirspaceMap } from './AirspaceMap';

interface RewindCorrelateViewProps {
  sightings: SightingReport[];
  currentAircraft: Aircraft[];
  onOpenReportModal: () => void;
}

export const RewindCorrelateView: React.FC<RewindCorrelateViewProps> = ({
  sightings,
  currentAircraft,
  onOpenReportModal,
}) => {
  const [selectedSightingId, setSelectedSightingId] = useState<number>(
    sightings.length > 0 ? sightings[0].id : 0
  );
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState<number>(0);
  const [selectedMatch, setSelectedMatch] = useState<Aircraft | null>(null);

  const activeSighting = useMemo(() => {
    return sightings.find((s) => s.id === selectedSightingId) || null;
  }, [sightings, selectedSightingId]);

  // Calculate simulated historical aircraft positions based on time offset and sighting location
  const simulatedRewindFlights: Aircraft[] = useMemo(() => {
    if (!activeSighting) return [];

    // For sighting #103 (Marcus K. Jensen, West Omaha): has a matched civil Cessna
    if (activeSighting.id === 103) {
      const offsetLat = (timeOffsetMinutes * 0.008);
      const offsetLon = (timeOffsetMinutes * 0.012);
      return [
        {
          hex: 'A5E902',
          callsign: 'N8421Z',
          registration: 'N8421Z',
          lat: 41.282 + offsetLat + 0.015,
          lon: -96.241 + offsetLon - 0.02,
          altitude: 3200,
          ground_speed: 110,
          track: 72,
          squawk: '1200',
          sources: ['adsb'],
          aircraft_type: 'C172 (Cessna 172 Skyhawk)',
          origin: 'MLE (Millard Airport)',
          destination: 'MLE (Millard Airport)',
        },
      ];
    }

    // For sightings with "no_match" (e.g. Fontenelle Forest #101, Bennington #102):
    // In realistic conditions, distant aircraft may be outside the tight radius or altitude
    if (activeSighting.id === 101 || activeSighting.id === 102) {
      if (searchRadius >= 50) {
        // High altitude distant flight beyond 50 miles
        return [
          {
            hex: 'A9E71F',
            callsign: 'DAL1422',
            registration: 'N374NW',
            lat: 41.95,
            lon: -96.85,
            altitude: 36000,
            ground_speed: 460,
            track: 265,
            squawk: '1105',
            sources: ['adsb', 'api'],
            aircraft_type: 'A320',
          },
        ];
      }
      return [];
    }

    return currentAircraft.slice(0, 2);
  }, [activeSighting, timeOffsetMinutes, searchRadius, currentAircraft]);

  // Calculate distance to sighting for each flight
  const flightMatches = useMemo(() => {
    if (!activeSighting) return [];

    return simulatedRewindFlights.map((flight) => {
      // Haversine formula
      const R = 3959; // Earth radius miles
      const dLat = ((flight.lat - activeSighting.lat) * Math.PI) / 180;
      const dLon = ((flight.lon - activeSighting.lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((activeSighting.lat * Math.PI) / 180) *
          Math.cos((flight.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        ...flight,
        distance_miles: Math.round(distance * 10) / 10,
      };
    }).sort((a, b) => a.distance_miles - b.distance_miles);
  }, [activeSighting, simulatedRewindFlights]);

  const currentIndex = sightings.findIndex((s) => s.id === selectedSightingId);
  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedSightingId(sightings[currentIndex - 1].id);
      setTimeOffsetMinutes(0);
    }
  };
  const handleNext = () => {
    if (currentIndex < sightings.length - 1) {
      setSelectedSightingId(sightings[currentIndex + 1].id);
      setTimeOffsetMinutes(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>90-DAY FLIGHT DATA RECORDER ARCHIVE · SIGHTING CORRELATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Historical Airspace Rewind
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Synchronize ADS-B receiver archives with user sighting timestamps to identify or rule out commercial, military, and civil aircraft.
          </p>
        </div>

        {/* Sighting Selector dropdown & controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
              title="Previous Sighting"
            >
              ◀ Prev
            </button>
            <span className="text-xs font-mono text-slate-400 px-2">
              {currentIndex + 1} / {sightings.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex >= sightings.length - 1}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded"
              title="Next Sighting"
            >
              Next ▶
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Rewind Map (7 cols) + Correlation Analysis Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map with Sighting Vector & Search Buffer */}
        <div className="lg:col-span-7 space-y-4">
          <AirspaceMap
            aircraft={flightMatches}
            activeSighting={activeSighting}
            searchRadiusMiles={searchRadius}
            selectedAircraft={selectedMatch}
            onSelectAircraft={(ac) => setSelectedMatch(ac)}
            heightClass="h-[460px] sm:h-[500px]"
          />

          {/* Time Scrubber & Radius Controls */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Temporal Scrubbing Window</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-cyan-400 font-semibold bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
                Offset: {timeOffsetMinutes >= 0 ? `+${timeOffsetMinutes}` : timeOffsetMinutes} min
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>-10 min</span>
                <span className="text-slate-200">Sighting Time (T=0)</span>
                <span>+10 min</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={timeOffsetMinutes}
                onChange={(e) => setTimeOffsetMinutes(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Radius selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Correlation Radius:</span>
                <span className="font-mono font-semibold text-white">{searchRadius} Miles</span>
              </div>

              <div className="flex items-center gap-1.5">
                {[10, 25, 50, 75].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSearchRadius(r)}
                    className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                      searchRadius === r
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sighting Details & Candidate Aircraft Correlation */}
        <div className="lg:col-span-5 space-y-4">
          {activeSighting ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              {/* Header with Type & Case ID */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    CASE RECORD #{activeSighting.id}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {activeSighting.type} Observation
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded">
                  {new Date(activeSighting.sighting_time).toLocaleDateString()}
                </span>
              </div>

              {/* Witness & Vector info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400">WITNESS</div>
                  <div className="font-medium text-slate-200">{activeSighting.reporter_name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{activeSighting.reporter_role || 'Civilian Witness'}</div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400">UTC TIMESTAMP</div>
                  <div className="font-mono text-slate-200">{new Date(activeSighting.sighting_time).toLocaleTimeString()}</div>
                  <div className="text-[10px] text-slate-400">{activeSighting.duration || 'Duration unrecorded'}</div>
                </div>
              </div>

              {/* Location & Angles */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="text-slate-400">Location:</span>
                  <span className="font-medium text-slate-200">{activeSighting.location_text}</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                  <span>GPS: <strong className="text-slate-300">{activeSighting.lat.toFixed(4)}°N, {activeSighting.lon.toFixed(4)}°W</strong></span>
                  {activeSighting.bearing !== undefined && (
                    <span>BEARING: <strong className="text-slate-300">{activeSighting.bearing}° Azimuth</strong></span>
                  )}
                  {activeSighting.elevation !== undefined && (
                    <span>ELEVATION: <strong className="text-slate-300">{activeSighting.elevation}°</strong></span>
                  )}
                </div>
              </div>

              {/* Narrative Description */}
              <div className="bg-slate-950/60 border border-slate-800/70 rounded-lg p-3 text-xs text-slate-300 leading-relaxed">
                <div className="text-[11px] font-mono text-slate-400 uppercase mb-1">
                  Witness Narrative
                </div>
                {activeSighting.description}
              </div>

              {/* Evidence photo if present */}
              {activeSighting.photo_path && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">
                    Field Photographic Evidence
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-48">
                    <img
                      src={activeSighting.photo_path}
                      alt={`Photo for sighting ${activeSighting.id}`}
                      className="w-full h-44 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}

              {/* AIRSPACE CORRELATION RESULTS */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                    ADS-B Archive Correlation
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Window: ±10m · {searchRadius}mi
                  </span>
                </div>

                {flightMatches.length === 0 ? (
                  /* CRITICAL WORDING RULE: MANDATORY EXACT TERMINOLOGY */
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="font-bold text-sm tracking-tight">
                        No ADS-B match found
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      No cooperative aircraft broadcasting ADS-B detected in the specified area and time window. Non-cooperative aircraft, military traffic, and coverage gaps are routine.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{flightMatches.length} Candidate Aircraft Identified in Vicinity</span>
                    </div>

                    <div className="space-y-2">
                      {flightMatches.map((flight) => (
                        <div
                          key={flight.hex}
                          onClick={() => setSelectedMatch(flight)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            selectedMatch?.hex === flight.hex
                              ? 'bg-cyan-950/40 border-cyan-500/70'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-sm">
                              {flight.callsign || flight.hex}
                            </span>
                            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
                              {flight.distance_miles} mi away
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-400 tabular-nums">
                            <span>ALT: <strong className="text-slate-200">{flight.altitude?.toLocaleString() || 'N/A'} ft</strong></span>
                            <span>SPD: <strong className="text-slate-200">{flight.ground_speed || 'N/A'} kts</strong></span>
                            <span>HDG: <strong className="text-slate-200">{flight.track}°</strong></span>
                          </div>

                          {flight.aircraft_type && (
                            <div className="text-[11px] text-slate-400 mt-1 truncate">
                              Aircraft: {flight.aircraft_type}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
              Select a sighting to begin historical correlation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
