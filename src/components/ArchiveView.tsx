import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Video,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Search,
  Filter,
  X,
  Eye,
  Calendar,
  Building2,
  MapPin,
  Maximize2,
} from 'lucide-react';

interface ArchiveItem {
  id: number;
  title: string;
  filename: string;
  agency: string;
  release: string;
  release_num: number;
  release_date: string;
  type: string;
  file_type: string;
  size_bytes: number;
  file_path: string;
  download_url: string;
  source_url: string;
  coordinates: { lat: number; lon: number } | null;
  location: string | null;
}

export const ArchiveView: React.FC = () => {
  const [metadata, setMetadata] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<string>('ALL');
  const [selectedRelease, setSelectedRelease] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await fetch('/api/archive/metadata');
        if (response.ok) {
          const data = await response.json();
          setMetadata(data);
        }
      } catch (err) {
        console.error('Failed to load archive metadata:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMetadata();
  }, []);

  // Cleanup video/iframe when modal closes
  useEffect(() => {
    if (!selectedItem) {
      // Clear any video/iframe elements that might still be playing
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        video.pause();
        video.src = '';
        video.load();
      });
    }
  }, [selectedItem]);

  // Get unique agencies, releases, types
  const agencies = useMemo(() => {
    const unique = new Set(metadata.map((item) => item.agency));
    return ['ALL', ...Array.from(unique).sort()];
  }, [metadata]);

  const releases = useMemo(() => {
    const unique = new Set(metadata.map((item) => item.release));
    return ['ALL', ...Array.from(unique).sort()];
  }, [metadata]);

  const types = useMemo(() => {
    const unique = new Set(metadata.map((item) => item.type));
    return ['ALL', ...Array.from(unique).sort()];
  }, [metadata]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return metadata.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(query) ||
          item.filename.toLowerCase().includes(query) ||
          item.agency.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Agency filter
      if (selectedAgency !== 'ALL' && item.agency !== selectedAgency) return false;

      // Release filter
      if (selectedRelease !== 'ALL' && item.release !== selectedRelease) return false;

      // Type filter
      if (selectedType !== 'ALL' && item.type !== selectedType) return false;

      return true;
    });
  }, [metadata, searchQuery, selectedAgency, selectedRelease, selectedType]);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get icon for file type
  const getFileIcon = (type: string) => {
    if (type === 'PDF Document') return <FileText className="w-5 h-5" />;
    if (type === 'Video Footage') return <Video className="w-5 h-5" />;
    if (type === 'Image') return <ImageIcon className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Loading archive...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mb-1">
          <Eye className="w-3.5 h-3.5" />
          <span>FEDERAL GOVERNMENT UAP DISCLOSURE ARCHIVE</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Government Files Archive
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">
          Public domain releases from federal agencies via War.gov UAP Archive. {metadata.length} documents
          and footage indexed. Click any item to view in-browser.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, filename, or agency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Agency Filter */}
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {agencies.map((agency) => (
              <option key={agency} value={agency}>
                {agency === 'ALL' ? 'ALL AGENCIES' : agency}
              </option>
            ))}
          </select>

          {/* Release Filter */}
          <select
            value={selectedRelease}
            onChange={(e) => setSelectedRelease(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {releases.map((release) => (
              <option key={release} value={release}>
                {release === 'ALL' ? 'ALL RELEASES' : release}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type === 'ALL' ? 'ALL TYPES' : type}
              </option>
            ))}
          </select>

          {/* Result Count */}
          <div className="ml-auto flex items-center text-sm text-slate-400 font-mono">
            <span className="font-semibold text-cyan-400">{filteredItems.length}</span>
            <span className="ml-1">results</span>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 text-left transition-all group"
          >
            {/* Type Icon & Metadata Tags */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="text-amber-400">{getFileIcon(item.type)}</div>
              <div className="flex flex-wrap gap-1.5 items-start">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                  {item.agency}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                  {item.release}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2 group-hover:text-cyan-400 transition-colors">
              {item.title}
            </h3>

            {/* Metadata Row */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(item.release_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{item.file_type.toUpperCase()}</span>
              </div>
              <div className="ml-auto text-slate-500">{formatSize(item.size_bytes)}</div>
            </div>

            {/* Location if available */}
            {item.location && (
              <div className="flex items-center gap-1 text-xs text-cyan-400 mt-2">
                <MapPin className="w-3 h-3" />
                <span>{item.location}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-12 text-center">
          <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No files match your search criteria</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedAgency('ALL');
              setSelectedRelease('ALL');
              setSelectedType('ALL');
            }}
            className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Viewer Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border-0 sm:border sm:border-slate-800 rounded-none sm:rounded-xl w-full h-full sm:max-w-6xl sm:max-h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-start justify-between shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-mono text-amber-400 bg-amber-950/30 border border-amber-800/50 px-2 py-0.5 rounded">
                    {selectedItem.agency}
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    {selectedItem.release}
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    {selectedItem.type}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{selectedItem.title}</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Released: {new Date(selectedItem.release_date).toLocaleDateString()} • {formatSize(selectedItem.size_bytes)}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white transition-colors ml-3 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewer Area */}
            <div className="flex-1 overflow-y-auto bg-black/50">
              {/* PDF Viewer */}
              {selectedItem.type === 'PDF Document' && (
                <div className="w-full h-full min-h-[70vh]">
                  <iframe
                    src={selectedItem.download_url}
                    type="application/pdf"
                    className="w-full h-full"
                    title={selectedItem.title}
                  />
                  <div className="p-4 bg-slate-950 text-xs text-slate-400">
                    <p>
                      If the PDF doesn't display,{' '}
                      <a
                        href={selectedItem.download_url}
                        download
                        className="text-cyan-400 hover:underline"
                      >
                        download it here
                      </a>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Video Player */}
              {selectedItem.type === 'Video Footage' && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <div className="w-full max-w-4xl">
                    <video
                      controls
                      preload="none"
                      className="w-full rounded-lg"
                      poster="/icons/icon-192.png"
                      playsInline
                    >
                      <source src={selectedItem.download_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p className="text-xs text-slate-400 mt-3 text-center">
                      Note: Video files are served from local archive. Seeking is supported via HTTP Range requests.
                    </p>
                  </div>
                </div>
              )}

              {/* Image Viewer */}
              {selectedItem.type === 'Image' && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <div className="relative max-w-full max-h-full">
                    <img
                      src={selectedItem.download_url}
                      alt={selectedItem.title}
                      className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    />
                    <a
                      href={selectedItem.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 right-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded-lg transition-colors"
                      title="Open full resolution in new tab"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-3 shrink-0">
              {/* File Info Row */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono truncate">{selectedItem.filename}</span>
                <span className="ml-2">{selectedItem.file_type.toUpperCase()}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href={selectedItem.download_url}
                  download={selectedItem.filename}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
                <a
                  href="https://www.war.gov/ufo/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  title="War.gov UAP Archive (general index)"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Archive Index</span>
                  <span className="sm:hidden">Index</span>
                </a>
              </div>

              {/* Attribution */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-xs text-slate-400">
                <p>
                  <strong className="text-slate-300">Source:</strong> Federal government public
                  domain release via War.gov UAP Archive (general index)
                </p>
                <p className="mt-1">
                  This material is in the public domain as a work of the U.S. federal government.
                  No copyright restrictions apply.
                </p>
              </div>

              {/* Legal Notice */}
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-2 text-xs text-amber-200/80">
                <p>
                  <strong>Notice:</strong> This is a MUFON Omaha public archive of federal
                  government releases. We are not affiliated with or endorsed by any government
                  agency. All materials are presented as released by the source agencies.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
