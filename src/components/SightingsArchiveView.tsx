import React, { useState, useMemo } from 'react';
import { Search, Eye, Camera, MapPin, Calendar, Clock, Compass, ArrowRight, ShieldAlert, CheckCircle2, Download, BarChart2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { SightingReport, SightingType } from '../types';
import { SightingsD3Analytics, FilterCriteria, getSightingSector, OMAHA_SECTORS } from './SightingsD3Analytics';

interface SightingsArchiveViewProps {
  sightings: SightingReport[];
  onSelectForRewind: (sightingId: number) => void;
  onOpenReportModal: () => void;
}

const ALL_TYPES: SightingType[] = [
  'Sphere/Orb',
  'Disc',
  'Triangle',
  'Cylinder',
  'Rectangle',
  'Diamond',
  'Formation',
  'Light',
  'Fireball',
  'Other',
];

export const SightingsArchiveView: React.FC<SightingsArchiveViewProps> = ({
  sightings,
  onSelectForRewind,
  onOpenReportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'correlated' | 'no_match'>('all');
  const [showAnalytics, setShowAnalytics] = useState<boolean>(true);
  const [d3Filter, setD3Filter] = useState<FilterCriteria>({
    hour: null,
    sector: null,
    timeWindow: null,
  });

  const filteredSightings = useMemo(() => {
    return sightings.filter((s) => {
      const matchesSearch =
        s.reporter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'all' || s.type === selectedType;

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'correlated'
          ? s.correlation_status === 'correlated'
          : s.correlation_status === 'no_match';

      // D3 hour filter (matches local hour or UTC)
      let matchesHour = true;
      if (d3Filter.hour !== null && d3Filter.hour !== undefined) {
        const d = new Date(s.sighting_time);
        matchesHour = d.getHours() === d3Filter.hour;
      }

      // D3 sector filter
      let matchesSector = true;
      if (d3Filter.sector) {
        const sector = getSightingSector(s.lat, s.lon);
        matchesSector = sector.id === d3Filter.sector;
      }

      return matchesSearch && matchesType && matchesStatus && matchesHour && matchesSector;
    });
  }, [sightings, searchTerm, selectedType, statusFilter, d3Filter]);

  const handleDownloadCsv = () => {
    const exportList = filteredSightings.length > 0 ? filteredSightings : sightings;

    const headers = [
      'Case ID',
      'Observation Time (UTC)',
      'Local Date & Time',
      'Silhouette / Type',
      'Witness Name',
      'Witness Role',
      'Location Description',
      'Latitude (°N)',
      'Longitude (°W)',
      'Azimuth Bearing (°)',
      'Elevation Angle (°)',
      'Duration',
      'ADS-B Correlation Status',
      'Matched Flight Callsign',
      'Matched Flight ICAO',
      'Photo Evidence Attached',
      'Witness Narrative Description',
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = exportList.map((s) =>
      [
        s.id,
        s.sighting_time,
        new Date(s.sighting_time).toLocaleString(),
        s.type,
        s.reporter_name,
        s.reporter_role || 'Civilian Witness',
        s.location_text,
        s.lat,
        s.lon,
        s.bearing !== undefined && s.bearing !== null ? s.bearing : '',
        s.elevation !== undefined && s.elevation !== null ? s.elevation : '',
        s.duration || '',
        s.correlation_status === 'correlated' ? 'Matched to Known Flight' : 'No ADS-B match found',
        s.matched_aircraft?.callsign || '',
        s.matched_aircraft?.icao_hex || '',
        s.photo_path ? 'YES' : 'NO',
        s.description,
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `omaha_mufon_sightings_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Eye className="w-3.5 h-3.5" />
            <span>NEBRASKA REGIONAL UAP DATABASE · FIELD INVESTIGATION ARCHIVE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Sighting Reports Archive
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Verified civilian and scientific field reports with angular bearing, elevation angles, and ADS-B cross-referencing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-lg transition-colors shadow-sm ${
              showAnalytics
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Toggle D3.js Historical Telemetry & Spatial Clustering Visualizer"
          >
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>D3 Analytics {showAnalytics ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono text-slate-200 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg transition-colors shadow-sm"
            title="Export filtered reports as formatted CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download CSV ({filteredSightings.length})</span>
          </button>

          <button
            onClick={onOpenReportModal}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shrink-0 shadow-sm"
          >
            Submit Sighting Report
          </button>
        </div>
      </div>

      {/* D3.js Interactive Visualization Module */}
      {showAnalytics && (
        <SightingsD3Analytics
          sightings={sightings}
          activeFilter={d3Filter}
          onFilterChange={setD3Filter}
        />
      )}

      {/* Active D3 Filter Notice Banner */}
      {(d3Filter.hour !== null || d3Filter.sector !== null) && (
        <div className="flex items-center justify-between p-3 px-4 bg-cyan-950/40 border border-cyan-700/50 rounded-xl text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-bold">D3 FILTER APPLIED:</span>
            {d3Filter.hour !== null && d3Filter.hour !== undefined && (
              <span className="px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-600/60 text-cyan-200">
                Hour Window: {String(d3Filter.hour).padStart(2, '0')}:00 -{' '}
                {String((d3Filter.hour + 1) % 24).padStart(2, '0')}:00
              </span>
            )}
            {d3Filter.sector && (
              <span className="px-2 py-0.5 rounded bg-cyan-900/60 border border-cyan-600/60 text-cyan-200">
                Sector: {OMAHA_SECTORS.find((s) => s.id === d3Filter.sector)?.name}
              </span>
            )}
            <span className="text-slate-400">({filteredSightings.length} matching reports)</span>
          </div>

          <button
            onClick={() => setD3Filter({ hour: null, sector: null, timeWindow: null })}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-slate-600 rounded transition-colors text-[11px]"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear D3 Filter</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reports by witness, location, keywords (e.g., Fontenelle, chevron, Offutt)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-4 flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Reports
            </button>
            <button
              onClick={() => setStatusFilter('no_match')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'no_match'
                  ? 'bg-amber-950/80 border border-amber-800/60 text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              No ADS-B Match
            </button>
            <button
              onClick={() => setStatusFilter('correlated')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'correlated'
                  ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Correlated
            </button>
          </div>
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
          <span className="text-[11px] font-mono uppercase text-slate-500 shrink-0">
            Shape / Type:
          </span>
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
              selectedType === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-950 border border-slate-800 hover:text-white'
            }`}
          >
            All Types ({sightings.length})
          </button>
          {ALL_TYPES.map((type) => {
            const count = sightings.filter((s) => s.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                  selectedType === type
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-950 border border-slate-800 hover:text-white'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Sighting Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSightings.map((sighting) => {
          const hasPhoto = Boolean(sighting.photo_path);
          const isCorrelated = sighting.correlation_status === 'correlated';

          return (
            <div
              key={sighting.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden flex flex-col justify-between transition-all group"
            >
              {/* Photo header if available */}
              {hasPhoto && (
                <div className="relative h-44 overflow-hidden bg-slate-950">
                  <img
                    src={sighting.photo_path}
                    alt={sighting.type}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 flex items-center gap-1 border border-slate-800">
                    <Camera className="w-3 h-3 text-cyan-400" />
                    <span>Photo Attached</span>
                  </div>
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  {/* Clean unboxed metadata with bullet separators */}
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2">
                    <span className="text-cyan-400 font-semibold">{sighting.type}</span>
                    <span>·</span>
                    <span>#{sighting.id}</span>
                    <span>·</span>
                    <span>{new Date(sighting.sighting_time).toLocaleDateString()}</span>
                  </div>

                  <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                    {sighting.location_text}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {sighting.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-800/80">
                  {/* Telemetry vector values */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div>
                      WITNESS: <span className="text-slate-200">{sighting.reporter_name}</span>
                    </div>
                    <div>
                      BEARING: <span className="text-slate-200">{sighting.bearing ? `${sighting.bearing}°` : 'Unspecified'}</span>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="flex items-center justify-between pt-1">
                    {isCorrelated ? (
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Matched to Known Flight</span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>No ADS-B match found</span>
                      </span>
                    )}

                    <button
                      onClick={() => onSelectForRewind(sighting.id)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Rewind & Match</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSightings.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <p className="text-base font-medium text-slate-300">No reports matched your search criteria.</p>
          <p className="text-xs text-slate-500 mt-1">Try resetting the shape or status filter.</p>
        </div>
      )}
    </div>
  );
};
