import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveRadarView } from './components/LiveRadarView';
import { RewindCorrelateView } from './components/RewindCorrelateView';
import { SightingsArchiveView } from './components/SightingsArchiveView';
import { FieldDispatchView } from './components/FieldDispatchView';
import { StationInfoView } from './components/StationInfoView';
import { ReportSightingModal } from './components/ReportSightingModal';
import { INITIAL_AIRCRAFT, INITIAL_SIGHTINGS, INITIAL_CHAT, OMAHA_STATION } from './data/initialData';
import { Aircraft, SightingReport, ChatMessage } from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'rewind' | 'sightings' | 'dispatch' | 'station'>('radar');
  const [aircraft, setAircraft] = useState<Aircraft[]>(INITIAL_AIRCRAFT);
  const [sightings, setSightings] = useState<SightingReport[]>(INITIAL_SIGHTINGS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  // Trigger toast notification
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Attempt to fetch from local/live backend if running; fallback to simulated live telemetry
  useEffect(() => {
    let isMounted = true;

    const fetchLiveAircraft = async () => {
      try {
        const res = await fetch('/api/aircraft/live');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            setAircraft(data);
          }
        }
      } catch {
        // Fallback to client-side simulated live positions with slight movement
        if (isMounted) {
          setAircraft((prev) =>
            prev.map((ac) => {
              const headingRad = ((ac.track || 0) * Math.PI) / 180;
              // Slight speed drift
              const delta = 0.0006;
              const nextLat = ac.lat + Math.cos(headingRad) * delta;
              const nextLon = ac.lon + Math.sin(headingRad) * delta;
              return {
                ...ac,
                lat: nextLat,
                lon: nextLon,
                last_seen: new Date().toISOString(),
              };
            })
          );
        }
      }
    };

    fetchLiveAircraft();
    const interval = setInterval(fetchLiveAircraft, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle Sighting submission
  const handleReportSubmit = (newReportData: Omit<SightingReport, 'id' | 'created_at'>) => {
    const newId = sightings.length > 0 ? Math.max(...sightings.map((s) => s.id)) + 1 : 101;
    const newReport: SightingReport = {
      ...newReportData,
      id: newId,
      created_at: new Date().toISOString(),
    };

    setSightings([newReport, ...sightings]);
    showToast(`Sighting Report #${newId} logged successfully. Ready for correlation.`, 'success');
  };

  // Handle Chat message
  const handleSendMessage = (
    name: string,
    role: string,
    message: string,
    tag: 'alert' | 'sighting' | 'weather' | 'general'
  ) => {
    const newMsg: ChatMessage = {
      id: Date.now(),
      name,
      role,
      message,
      timestamp: new Date().toISOString(),
      tag,
    };
    setChatMessages([newMsg, ...chatMessages]);
    showToast('Dispatch logged to investigator frequency.', 'info');
  };

  // Jump to Rewind tab with specific sighting selected
  const handleSelectSightingForRewind = (sightingId: number) => {
    setActiveTab('rewind');
    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900 border border-cyan-500/80 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono text-cyan-300 animate-in fade-in slide-in-from-top-2 duration-200">
          {toastType === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Header following Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        liveCount={aircraft.length}
        receiverStatus={OMAHA_STATION.status}
      />

      {/* Main Content Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'radar' && (
          <LiveRadarView
            aircraft={aircraft}
            onSelectForRewind={() => setActiveTab('rewind')}
          />
        )}

        {activeTab === 'rewind' && (
          <RewindCorrelateView
            sightings={sightings}
            currentAircraft={aircraft}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}

        {activeTab === 'sightings' && (
          <SightingsArchiveView
            sightings={sightings}
            onSelectForRewind={handleSelectSightingForRewind}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        )}

        {activeTab === 'dispatch' && (
          <FieldDispatchView
            messages={chatMessages}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'station' && <StationInfoView />}
      </main>

      {/* Report Sighting Modal */}
      <ReportSightingModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={handleReportSubmit}
      />

      {/* Professional Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Omaha MUFON SkyRewind</span>
            <span>·</span>
            <span>Nebraska Chapter Investigative Tracker</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>ADS-B Feeder: 1090 MHz</span>
            <span>·</span>
            <span>OpenSky Network Proxy</span>
            <span>·</span>
            <span>OpenStreetMap Contributors</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
