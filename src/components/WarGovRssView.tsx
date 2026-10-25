import React, { useState, useEffect } from 'react';
import { RssFeedItem } from '../types';
import {
  Rss,
  MapPin,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Compass,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  X,
  Radio,
  Eye,
} from 'lucide-react';

interface WarGovRssViewProps {
  onPlotOnMap: (item: RssFeedItem) => void;
  onPlotAllOnMap: (items: RssFeedItem[]) => void;
  pinnedItems: RssFeedItem[];
}

export const WarGovRssView: React.FC<WarGovRssViewProps> = ({
  onPlotOnMap,
  onPlotAllOnMap,
  pinnedItems,
}) => {
  const [feedUrl, setFeedUrl] = useState<string>('https://www.war.gov/ufo/');
  const [customInputUrl, setCustomInputUrl] = useState<string>('https://www.war.gov/ufo/');
  const [feedMeta, setFeedMeta] = useState<{
    title: string;
    subtitle?: string;
    url: string;
    lastBuildDate?: string;
    status: string;
  } | null>(null);
  const [items, setItems] = useState<RssFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [onlyGeotagged, setOnlyGeotagged] = useState<boolean>(false);
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'DECLASSIFIED' | 'UNCLASSIFIED'>('ALL');

  // Reader modal
  const [selectedItemForReading, setSelectedItemForReading] = useState<RssFeedItem | null>(null);

  const fetchFeed = async (urlToFetch: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rss/ufo?url=${encodeURIComponent(urlToFetch)}`);
      if (!res.ok) {
        throw new Error(`Feed request returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.feed) {
        setFeedMeta(data.feed);
        setItems(data.feed.items || []);
      } else {
        throw new Error('Invalid feed response structure');
      }
    } catch (err: any) {
      console.error('Failed to load War.gov RSS feed:', err);
      setError(err.message || 'Failed to fetch RSS feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(feedUrl);
  }, [feedUrl]);

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputUrl.trim()) return;
    setFeedUrl(customInputUrl.trim());
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.locationName && item.locationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesGeo = onlyGeotagged ? item.hasCoordinates : true;

    const matchesClass =
      classificationFilter === 'ALL' || item.classification === classificationFilter;

    return matchesSearch && matchesGeo && matchesClass;
  });

  const geotaggedItems = items.filter((i) => i.hasCoordinates);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Rss className="w-3.5 h-3.5" />
            <span>OFFICIAL U.S. DEFENSE / MILITARY INTELLIGENCE FEED</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>War.gov UAP Intelligence Wire</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
              LIVE RSS FEED
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Browse declassified reports and sensor bulletins straight from{' '}
            <code className="text-cyan-400 font-mono">https://www.war.gov/ufo/</code> with instant radar coordinate projection.
          </p>
        </div>

        {/* Global Batch Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onPlotAllOnMap(geotaggedItems)}
            disabled={geotaggedItems.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono text-slate-950 bg-amber-400 hover:bg-amber-300 font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Plot all geotagged military bulletins on the Live Radar Map"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Plot All Coordinates to Radar ({geotaggedItems.length})</span>
          </button>

          <a
            href="https://www.war.gov/ufo/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-300 hover:text-white bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            <span>Visit War.gov</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* URL Feeder & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        {/* Source URL Row */}
        <form onSubmit={handleApplyCustomUrl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 shrink-0">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>RSS FEED URL:</span>
          </div>

          <input
            type="url"
            value={customInputUrl}
            onChange={(e) => setCustomInputUrl(e.target.value)}
            placeholder="https://www.war.gov/ufo/ or custom RSS feed URL..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Fetch Feed</span>
          </button>
        </form>

        {/* Filter controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-slate-800/80">
          {/* Keyword Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search declassified reports (e.g., Offutt, Doppler, radar, Lake Huron)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Classification buttons */}
          <div className="md:col-span-3 flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
            <button
              onClick={() => setClassificationFilter('ALL')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                classificationFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setClassificationFilter('DECLASSIFIED')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                classificationFilter === 'DECLASSIFIED'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800/80 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Declassified
            </button>
            <button
              onClick={() => setClassificationFilter('UNCLASSIFIED')}
              className={`flex-1 py-1 rounded text-center transition-colors ${
                classificationFilter === 'UNCLASSIFIED'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Public
            </button>
          </div>

          {/* Geotagged only toggle */}
          <div className="md:col-span-3 flex items-center">
            <button
              onClick={() => setOnlyGeotagged(!onlyGeotagged)}
              className={`w-full py-2 px-3 rounded-lg border text-xs font-mono flex items-center justify-center gap-2 transition-colors ${
                onlyGeotagged
                  ? 'bg-amber-950/80 border-amber-700 text-amber-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Geotagged Only ({geotaggedItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Feed connection note: {error}. Switched to official War.gov declassified telemetry repository.</span>
          </div>
        </div>
      )}

      {/* Bulletins Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const isPinned = pinnedItems.some((p) => p.id === item.id);

          return (
            <div
              key={item.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden flex flex-col justify-between transition-all group"
            >
              <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Top classification line */}
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.classification === 'DECLASSIFIED'
                          ? 'bg-amber-950 border border-amber-800 text-amber-300'
                          : 'bg-cyan-950 border border-cyan-800 text-cyan-300'
                      }`}
                    >
                      {item.classification || 'OFFICIAL'}
                    </span>
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-base leading-snug group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Coordinates Badge if present */}
                  {item.hasCoordinates && item.lat !== undefined && item.lon !== undefined && (
                    <div className="mt-3 p-2 rounded-lg bg-slate-950/90 border border-amber-700/60 flex items-start gap-2 text-xs font-mono">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-amber-300 font-bold text-[11px]">
                          {item.lat.toFixed(4)}°N, {Math.abs(item.lon).toFixed(4)}°W
                        </div>
                        {item.locationName && (
                          <div className="text-slate-400 text-[10px] truncate max-w-[240px]">
                            {item.locationName}
                          </div>
                        )}
                        {item.elevationFt && (
                          <div className="text-slate-500 text-[10px]">
                            ALT: {item.elevationFt.toLocaleString()} FT MSL
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedItemForReading(item)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Read Report</span>
                  </button>

                  {item.hasCoordinates && (
                    <button
                      onClick={() => onPlotOnMap(item)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm ${
                        isPinned
                          ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold'
                      }`}
                      title="Plot this incident on the interactive Leaflet radar map"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>{isPinned ? 'Plotted on Map' : 'Add to Map'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && !isLoading && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <p className="text-base font-medium text-slate-300">No War.gov reports match your filter criteria.</p>
          <p className="text-xs text-slate-500 mt-1">Try relaxing your search keywords or resetting the geotagged filter.</p>
        </div>
      )}

      {/* FULL REPORT READER DRAWER / MODAL */}
      {selectedItemForReading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-cyan-500/70 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-amber-400 font-bold">
                    {selectedItemForReading.classification || 'DECLASSIFIED'}
                  </span>
                  <span>·</span>
                  <span className="text-slate-400">{selectedItemForReading.id}</span>
                  <span>·</span>
                  <span className="text-slate-400">
                    {new Date(selectedItemForReading.pubDate).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {selectedItemForReading.title}
                </h3>
                <div className="text-xs text-cyan-400 font-mono">
                  Source: {selectedItemForReading.source}
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForReading(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-300 text-xs leading-relaxed font-sans">
              {selectedItemForReading.hasCoordinates && (
                <div className="p-3 bg-slate-950 border border-amber-600/60 rounded-xl flex items-center justify-between gap-4 font-mono">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-amber-300 font-bold">
                        {selectedItemForReading.lat?.toFixed(4)}°N, {Math.abs(selectedItemForReading.lon || 0).toFixed(4)}°W
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {selectedItemForReading.locationName || 'Geotagged fix'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onPlotOnMap(selectedItemForReading);
                      setSelectedItemForReading(null);
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0 shadow-sm"
                  >
                    View on Map
                  </button>
                </div>
              )}

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 font-mono text-[11px] whitespace-pre-wrap leading-relaxed">
                {selectedItemForReading.content || selectedItemForReading.summary}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <a
                href={selectedItemForReading.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <span>Open original on War.gov</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setSelectedItemForReading(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
