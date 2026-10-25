import React from 'react';
import { Radio } from 'lucide-react';

interface HeaderProps {
  activeTab: 'radar' | 'rewind' | 'sightings' | 'dispatch' | 'station';
  setActiveTab: (tab: 'radar' | 'rewind' | 'sightings' | 'dispatch' | 'station') => void;
  onOpenReportModal: () => void;
  liveCount: number;
  receiverStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenReportModal,
  liveCount,
  receiverStatus,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single line, no pill badges attached) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <button
            onClick={() => setActiveTab('radar')}
            className="text-left text-lg font-bold tracking-tight text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Omaha MUFON <span className="font-normal text-slate-400">Airspace Tracker</span>
          </button>
        </div>

        {/* Zone 2: 4-5 concise single-line navigation links */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('radar')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'radar'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Live Radar
          </button>
          <button
            onClick={() => setActiveTab('rewind')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'rewind'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Rewind & Correlate
          </button>
          <button
            onClick={() => setActiveTab('sightings')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'sightings'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Sighting Archive
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'dispatch'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Field Dispatch
          </button>
          <button
            onClick={() => setActiveTab('station')}
            className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 border-b-2 ${
              activeTab === 'station'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Station Info
          </button>
        </nav>

        {/* Zone 3: 1 primary action + subtle receiver status */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono tabular-nums text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                receiverStatus === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300">{liveCount}</span>
            <span>aircraft tracked</span>
          </div>

          <button
            onClick={onOpenReportModal}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 transition-colors shadow-sm whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Report Sighting
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <div className="flex lg:hidden overflow-x-auto gap-4 pt-3 pb-1 border-t border-slate-800/80 mt-2.5 text-xs text-slate-400">
        <button
          onClick={() => setActiveTab('radar')}
          className={`whitespace-nowrap shrink-0 px-2 py-1 ${activeTab === 'radar' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Live Radar
        </button>
        <button
          onClick={() => setActiveTab('rewind')}
          className={`whitespace-nowrap shrink-0 px-2 py-1 ${activeTab === 'rewind' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Rewind & Correlate
        </button>
        <button
          onClick={() => setActiveTab('sightings')}
          className={`whitespace-nowrap shrink-0 px-2 py-1 ${activeTab === 'sightings' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Sighting Archive
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`whitespace-nowrap shrink-0 px-2 py-1 ${activeTab === 'dispatch' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Field Dispatch
        </button>
        <button
          onClick={() => setActiveTab('station')}
          className={`whitespace-nowrap shrink-0 px-2 py-1 ${activeTab === 'station' ? 'text-cyan-400 font-semibold' : ''}`}
        >
          Station Info
        </button>
      </div>
    </header>
  );
};
