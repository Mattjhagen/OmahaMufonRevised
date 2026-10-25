import React, { useState, useEffect, useRef } from 'react';
import {
  Plane,
  Search,
  Compass,
  Gauge,
  Radio,
  ShieldCheck,
  ArrowUpRight,
  Cloud,
  CloudRain,
  Wind,
  Thermometer,
  Eye,
  MessageSquare,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Aircraft, AtmosphericData, WeatherLayerType, ChatMessage } from '../types';
import { AirspaceMap } from './AirspaceMap';

interface LiveRadarViewProps {
  aircraft: Aircraft[];
  onSelectForRewind?: (flight: Aircraft) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (name: string, role: string, message: string, tag: 'alert' | 'sighting' | 'weather' | 'general') => void;
}

export const LiveRadarView: React.FC<LiveRadarViewProps> = ({
  aircraft,
  onSelectForRewind,
  chatMessages,
  onSendMessage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'adsb' | 'api'>('all');
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(
    aircraft.length > 0 ? aircraft[0] : null
  );

  // Weather overlay state
  const [weatherLayer, setWeatherLayer] = useState<WeatherLayerType>('none');
  const [weatherOpacity, setWeatherOpacity] = useState<number>(0.65);
  const [weatherData, setWeatherData] = useState<AtmosphericData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [showAtmosphericDetails, setShowAtmosphericDetails] = useState<boolean>(true);

  // Live Chat panel state
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatAuthor, setChatAuthor] = useState<string>('Omaha Spotter');
  const [chatRole, setChatRole] = useState<string>('Field Investigator');
  const [chatInput, setChatInput] = useState<string>('');
  const [chatTag, setChatTag] = useState<'alert' | 'sighting' | 'weather' | 'general'>('general');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  // Fetch live weather data from /api/weather
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      setIsWeatherLoading(true);
      try {
        const res = await fetch('/api/weather?lat=41.2565&lon=-95.9345');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setWeatherData(data);
        }
      } catch (err) {
        console.error('Failed to load weather:', err);
      } finally {
        if (isMounted) setIsWeatherLoading(false);
      }
    };

    fetchWeather();
    // Poll weather every 5 minutes
    const interval = setInterval(fetchWeather, 300000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatAuthor.trim() || 'Observer', chatRole, chatInput.trim(), chatTag);
    setChatInput('');
  };

  const insertFlightCallout = (callsign: string) => {
    setChatInput((prev) => (prev ? `${prev} [Track: ${callsign}]` : `Tracking flight ${callsign} on radar`));
    setIsChatOpen(true);
  };

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
      {/* Top Telemetry Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>OMAHA AIRSPACE MONITOR · ADS-B & OPENWEATHERMAP INTEGRATED</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Live Airspace Surveillance
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time aircraft radar with atmospheric layer correlation to detect tropospheric ducting and sky visibility conditions.
          </p>
        </div>

        {/* Telemetry Stats & Live Chat Toggle */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
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

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-mono transition-colors shadow-sm ${
              isChatOpen
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Radar Chat ({chatMessages.length})</span>
          </button>
        </div>
      </div>

      {/* Atmospheric Condition Ribbon (OpenWeatherMap Correlation Layer) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Atmospheric Conditions & Sighting Correlation</span>
                {weatherData && (
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
                    {weatherData.source}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Omaha Metro Area · Correlation baseline for mirage refraction, bolide visibility, and cloud obstruction
              </p>
            </div>
          </div>

          {/* Weather Layer Selector Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
            <span className="text-[11px] text-slate-500 px-2 uppercase hidden sm:inline">Overlay:</span>
            <button
              onClick={() => setWeatherLayer('none')}
              className={`px-2.5 py-1 rounded transition-colors ${
                weatherLayer === 'none'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Off
            </button>
            <button
              onClick={() => setWeatherLayer('doppler')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                weatherLayer === 'doppler'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CloudRain className="w-3 h-3" />
              <span>Doppler Radar</span>
            </button>
            <button
              onClick={() => setWeatherLayer('clouds')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                weatherLayer === 'clouds'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cloud className="w-3 h-3" />
              <span>Clouds</span>
            </button>
            <button
              onClick={() => setWeatherLayer('wind')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                weatherLayer === 'wind'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wind className="w-3 h-3" />
              <span>Wind</span>
            </button>
            <button
              onClick={() => setWeatherLayer('temp')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                weatherLayer === 'temp'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Thermometer className="w-3 h-3" />
              <span>Temp</span>
            </button>
          </div>
        </div>

        {/* Real-time Atmospheric Telemetry Readouts */}
        {weatherData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">SURFACE TEMP</div>
              <div className="text-base font-mono font-bold text-white tabular-nums">
                {weatherData.temp}°F <span className="text-xs text-slate-400 font-normal">({weatherData.condition})</span>
              </div>
              <div className="text-[10px] text-slate-400">Dew Point: {weatherData.dew_point}°F</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">CLOUD CEILING</div>
              <div className="text-base font-mono font-bold text-white tabular-nums">
                {weatherData.cloud_ceiling_ft || 'Unlimited'}
              </div>
              <div className="text-[10px] text-slate-400">Cover: {weatherData.cloud_cover_percent}%</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">VISIBILITY</div>
              <div className="text-base font-mono font-bold text-white tabular-nums">
                {weatherData.visibility_miles} MI
              </div>
              <div className="text-[10px] text-slate-400">Atmospheric clarity</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">WIND VECTOR</div>
              <div className="text-base font-mono font-bold text-white tabular-nums">
                {weatherData.wind_speed_mph} MPH
              </div>
              <div className="text-[10px] text-slate-400">Heading: {weatherData.wind_deg}°</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
              <div className="text-[11px] font-mono text-slate-400">BAROMETER</div>
              <div className="text-base font-mono font-bold text-white tabular-nums">
                {weatherData.pressure} hPa
              </div>
              <div className="text-[10px] text-slate-400">Humidity: {weatherData.humidity}%</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 space-y-1">
              <div className="text-[11px] font-mono text-cyan-400">UAP SEEING / INVERSION</div>
              <div className="text-xs font-mono font-bold text-emerald-400 truncate">
                {weatherData.astronomical_seeing}
              </div>
              <div className="text-[10px] text-slate-400 truncate">Inversion: {weatherData.inversion_risk}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Split: Map (8 cols) + Directory/Chat (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Airspace Map with Weather Overlay */}
        <div className="lg:col-span-8 space-y-4">
          <AirspaceMap
            aircraft={filteredAircraft}
            selectedAircraft={selectedAircraft}
            onSelectAircraft={(ac) => setSelectedAircraft(ac)}
            weatherLayer={weatherLayer}
            weatherOpacity={weatherOpacity}
            heightClass="h-[520px] sm:h-[580px]"
          />

          {/* Active flight detail inspection drawer */}
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

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => insertFlightCallout(selectedAircraft.callsign || selectedAircraft.hex)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/60 rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ping in Chat</span>
                  </button>

                  {onSelectForRewind && (
                    <button
                      onClick={() => onSelectForRewind(selectedAircraft)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <span>Check Reports</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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

              {/* Atmospheric Sighting Correlation Note */}
              {weatherData && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Atmosphere at altitude: <strong className="text-slate-200">Wind {weatherData.wind_speed_mph} mph @ {weatherData.wind_deg}°</strong> · Visibility <strong className="text-slate-200">{weatherData.visibility_miles} mi</strong>
                  </span>
                  <span>
                    Ceiling vs Craft: <strong className="text-emerald-400 font-mono">Unobstructed Line-of-Sight</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Toggleable Flight Directory OR Live Radar Chat */}
        <div className="lg:col-span-4 bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col h-[520px] sm:h-[680px]">
          {/* Top Mode Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsChatOpen(false)}
                className={`text-xs font-mono px-2.5 py-1 rounded transition-colors ${
                  !isChatOpen ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Flights ({filteredAircraft.length})
              </button>
              <button
                onClick={() => setIsChatOpen(true)}
                className={`text-xs font-mono px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                  isChatOpen ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Live Chat</span>
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {isChatOpen ? 'Real-time Channel' : 'Omaha Sector'}
            </span>
          </div>

          {!isChatOpen ? (
            /* Flight Directory Mode */
            <>
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
            </>
          ) : (
            /* Live Radar Chat Mode */
            <div className="flex-1 flex flex-col justify-between pt-2">
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[380px]">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{msg.name}</span>
                        {msg.role && (
                          <span className="text-[10px] font-mono text-slate-500">[{msg.role}]</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">{msg.message}</p>
                  </div>
                ))}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="text"
                    value={chatAuthor}
                    onChange={(e) => setChatAuthor(e.target.value)}
                    placeholder="Your Name"
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200"
                  />
                  <select
                    value={chatTag}
                    onChange={(e) => setChatTag(e.target.value as any)}
                    className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200"
                  >
                    <option value="general">General</option>
                    <option value="sighting">Sighting</option>
                    <option value="alert">Alert</option>
                    <option value="weather">Weather</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Broadcast observation..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded hover:bg-cyan-400 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
