import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RotateCcw, Clock, AlertCircle, CheckCircle2, ChevronRight, Sliders, MapPin, Compass, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { Aircraft, SightingReport } from '../types';
import { AirspaceMap } from './AirspaceMap';
import { fetchAircraftPhotoWithCallsignFallback, AircraftPhoto } from '../utils/aircraftPhoto';
import { buildFlightradar24URL, getFlightradar24LinkText } from '../utils/flightradar24';

interface HistoryMetadata {
  earliest: string | null;
  latest: string | null;
  total_records: number;
  days_of_history: number;
  retention_days: number;
  recorder_started: string | null;
}

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
  const [selectedTime, setSelectedTime] = useState<Date | null>(null); // null = use sighting time
  const [selectedMatch, setSelectedMatch] = useState<Aircraft | null>(null);
  const [rewindFlights, setRewindFlights] = useState<Aircraft[]>([]);
  const [historyMeta, setHistoryMeta] = useState<HistoryMetadata | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Aircraft photo state for selected match
  const [aircraftPhoto, setAircraftPhoto] = useState<AircraftPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const activeSighting = useMemo(() => {
    return sightings.find((s) => s.id === selectedSightingId) || null;
  }, [sightings, selectedSightingId]);

  // Fetch history metadata on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch('/api/history-metadata');
        if (res.ok) {
          const data = await res.json();
          setHistoryMeta(data);
        }
      } catch (err) {
        console.error('Failed to fetch history metadata:', err);
      }
    };
    fetchMeta();
  }, []);

  // Fetch historical aircraft from backend rewind API
  useEffect(() => {
    if (!activeSighting) {
      setRewindFlights([]);
      return;
    }

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const fetchRewindAircraft = async () => {
      setIsLoadingHistory(true);
      try {
        // Use selected time or sighting time
        const targetTime = selectedTime || new Date(activeSighting.sighting_time);
        const time = targetTime.toISOString();

        const params = new URLSearchParams({
          time,
          lat: activeSighting.lat.toString(),
          lon: activeSighting.lon.toString(),
          radius: searchRadius.toString(),
        });

        const res = await fetch(`/api/rewind?${params}`, {
          signal: abortControllerRef.current?.signal
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // Deduplicate: one position per ICAO closest to target time
            const deduped = deduplicateByIcao(data, targetTime);
            setRewindFlights(deduped);
          } else {
            setRewindFlights([]);
          }
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Rewind API error:', errorData);
          setRewindFlights([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch rewind data:', err);
          setRewindFlights([]);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    };

    // Debounce: wait 300ms after last change
    const timeoutId = setTimeout(fetchRewindAircraft, 300);
    return () => clearTimeout(timeoutId);
  }, [activeSighting, selectedTime, searchRadius]);

  // Fetch aircraft photo when selected match changes
  useEffect(() => {
    if (!selectedMatch?.hex) {
      setAircraftPhoto(null);
      return;
    }

    let isMounted = true;

    const fetchPhoto = async () => {
      setPhotoLoading(true);
      setAircraftPhoto(null);

      const photo = await fetchAircraftPhotoWithCallsignFallback({
        hex: selectedMatch.hex,
        registration: selectedMatch.registration || null,
        callsign: selectedMatch.callsign || undefined,
      });

      if (isMounted) {
        setAircraftPhoto(photo);
        setPhotoLoading(false);
      }
    };

    fetchPhoto();

    return () => {
      isMounted = false;
    };
  }, [selectedMatch?.hex]); // Only re-fetch when hex changes

  // Deduplicate aircraft by ICAO, keeping the observation closest to target time
  const deduplicateByIcao = (observations: any[], targetTime: Date): Aircraft[] => {
    const byIcao = new Map<string, any>();

    for (const obs of observations) {
      const icao = obs.icao_hex;
      const obsTime = new Date(obs.timestamp);
      const timeDiff = Math.abs(obsTime.getTime() - targetTime.getTime());

      if (!byIcao.has(icao)) {
        byIcao.set(icao, { ...obs, timeDiff });
      } else {
        const existing = byIcao.get(icao);
        if (timeDiff < existing.timeDiff) {
          byIcao.set(icao, { ...obs, timeDiff });
        }
      }
    }

    // Convert to Aircraft format
    return Array.from(byIcao.values()).map(obs => ({
      hex: obs.icao_hex,
      callsign: obs.callsign,
      lat: obs.lat,
      lon: obs.lon,
      altitude: obs.altitude,
      ground_speed: obs.ground_speed,
      track: obs.track,
      squawk: obs.squawk,
    }));
  };

  const simulatedRewindFlights = rewindFlights;

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
      setSelectedTime(null); // Reset to sighting time
    }
  };
  const handleNext = () => {
    if (currentIndex < sightings.length - 1) {
      setSelectedSightingId(sightings[currentIndex + 1].id);
      setSelectedTime(null); // Reset to sighting time
    }
  };

  const handleBackToLive = () => {
    setSelectedTime(null); // Clear custom time, use sighting time
  };

  // Calculate date range for date picker (30 days back from now, or earliest available)
  const getDateLimits = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let minDate = thirtyDaysAgo;
    if (historyMeta?.earliest) {
      const earliestDate = new Date(historyMeta.earliest);
      minDate = earliestDate > thirtyDaysAgo ? earliestDate : thirtyDaysAgo;
    }

    return { minDate, maxDate: now };
  };

  const { minDate, maxDate } = getDateLimits();

  // Check if selected time is before earliest data
  const isBeforeEarliestData = selectedTime && historyMeta?.earliest
    ? selectedTime < new Date(historyMeta.earliest)
    : false;

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

          {/* Time Controls & Radius */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Historical Time Selection (30-Day Archive)</span>
              </div>
              {selectedTime && (
                <button
                  onClick={handleBackToLive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 rounded-lg hover:bg-cyan-950/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Back to Sighting Time
                </button>
              )}
            </div>

            {/* Date and Time Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase">Date</label>
                <input
                  type="date"
                  value={selectedTime ? selectedTime.toISOString().split('T')[0] : (activeSighting ? new Date(activeSighting.sighting_time).toISOString().split('T')[0] : '')}
                  min={minDate.toISOString().split('T')[0]}
                  max={maxDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      const currentTime = selectedTime || (activeSighting ? new Date(activeSighting.sighting_time) : new Date());
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      const newTime = new Date(currentTime);
                      newTime.setFullYear(year, month - 1, day);
                      setSelectedTime(newTime);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase">Time (UTC)</label>
                <input
                  type="time"
                  step="60"
                  value={selectedTime ? selectedTime.toISOString().split('T')[1].substring(0, 5) : (activeSighting ? new Date(activeSighting.sighting_time).toISOString().split('T')[1].substring(0, 5) : '')}
                  onChange={(e) => {
                    if (e.target.value) {
                      const currentTime = selectedTime || (activeSighting ? new Date(activeSighting.sighting_time) : new Date());
                      const [hours, minutes] = e.target.value.split(':').map(Number);
                      const newTime = new Date(currentTime);
                      newTime.setUTCHours(hours, minutes, 0, 0);
                      setSelectedTime(newTime);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* History availability info */}
            {historyMeta && (
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>History available:</span>
                  <span className="font-mono text-cyan-400">
                    {historyMeta.days_of_history.toFixed(1)} days ({historyMeta.total_records.toLocaleString()} records)
                  </span>
                </div>
                {historyMeta.recorder_started && (
                  <div className="flex items-center justify-between">
                    <span>Recording since:</span>
                    <span className="font-mono text-slate-300">
                      {new Date(historyMeta.recorder_started).toLocaleDateString()} {new Date(historyMeta.recorder_started).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Warning if selected time is before data */}
            {isBeforeEarliestData && (
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No tracking data before {historyMeta?.recorder_started ? new Date(historyMeta.recorder_started).toLocaleDateString() : 'recorder start'}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The recorder started on {historyMeta?.recorder_started ? new Date(historyMeta.recorder_started).toLocaleString() : 'an unknown date'}. Historical lookback only works for times after recording began.
                </p>
              </div>
            )}

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
                    Window: ±3m · {searchRadius}mi
                  </span>
                </div>

                {isBeforeEarliestData ? (
                  <div className="bg-slate-950 border border-amber-800/50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span className="font-bold text-sm tracking-tight">
                        No tracking data before {historyMeta?.recorder_started ? new Date(historyMeta.recorder_started).toLocaleDateString() : 'recorder start'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      The recorder started on {historyMeta?.recorder_started ? new Date(historyMeta.recorder_started).toLocaleString() : 'an unknown date'}. Selected time is before recording began. 30-day lookback only works once 30 days of data have accumulated.
                    </p>
                  </div>
                ) : isLoadingHistory ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">
                    <div className="text-sm text-slate-400">Loading historical data...</div>
                  </div>
                ) : flightMatches.length === 0 ? (
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
                      {flightMatches.map((flight) => {
                        const isSelected = selectedMatch?.hex === flight.hex;
                        return (
                          <div
                            key={flight.hex}
                            onClick={() => setSelectedMatch(flight)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isSelected
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

                            {/* Expanded view for selected aircraft */}
                            {isSelected && (
                              <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
                                {/* Aircraft Photo */}
                                {photoLoading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                                  </div>
                                ) : aircraftPhoto ? (
                                  <div className="space-y-2">
                                    <img
                                      src={aircraftPhoto.url}
                                      alt="Aircraft"
                                      className="w-full rounded-lg border border-slate-700"
                                    />
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400">
                                        Photo: <span className="text-cyan-400">{aircraftPhoto.photographer}</span>
                                      </span>
                                      <a
                                        href={aircraftPhoto.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Planespotters
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 text-center py-2">No photo for this airframe</p>
                                )}

                                {/* Flightradar24 Link */}
                                {(() => {
                                  const fr24URL = buildFlightradar24URL({
                                    callsign: flight.callsign || flight.hex,
                                    registration: flight.registration,
                                    hex: flight.hex,
                                  });
                                  const linkText = getFlightradar24LinkText({
                                    callsign: flight.callsign || flight.hex,
                                    registration: flight.registration,
                                    hex: flight.hex,
                                  });
                                  return fr24URL ? (
                                    <a
                                      href={fr24URL}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center gap-2 px-3 py-2 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>{linkText}</span>
                                    </a>
                                  ) : null;
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
