import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LiveRadarView } from './components/LiveRadarView';
import { RewindCorrelateView } from './components/RewindCorrelateView';
import { SightingsArchiveView } from './components/SightingsArchiveView';
import { FieldDispatchView } from './components/FieldDispatchView';
import { StationInfoView } from './components/StationInfoView';
import { ReportSightingModal } from './components/ReportSightingModal';
import { PWAPromptModal } from './components/PWAPromptModal';
import { INITIAL_AIRCRAFT, INITIAL_SIGHTINGS, INITIAL_CHAT, OMAHA_STATION } from './data/initialData';
import { Aircraft, SightingReport, ChatMessage } from './types';
import { CheckCircle2, AlertCircle, Bell, MessageSquare, Compass, X } from 'lucide-react';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useNotifications } from './hooks/useNotifications';

export default function App() {
  const [activeTab, setActiveTab] = useState<'radar' | 'rewind' | 'sightings' | 'dispatch' | 'station'>('radar');
  const [aircraft, setAircraft] = useState<Aircraft[]>(INITIAL_AIRCRAFT);
  const [sightings, setSightings] = useState<SightingReport[]>(INITIAL_SIGHTINGS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info'>('success');

  // PWA and Notification Hooks
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const {
    permission,
    requestPermission,
    sendNotification,
    inAppAlerts,
    dismissAlert,
    soundEnabled,
    setSoundEnabled,
  } = useNotifications();

  // Trigger brief status toast
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

    // Trigger mobile push & in-app notification
    sendNotification(
      `New UAP Sighting #${newId}: ${newReportData.type}`,
      `Observed near ${newReportData.location_text} (Bearing: ${newReportData.bearing}°)`,
      'sighting',
      '/#sightings'
    );
  };

  // Handle Chat message: append to BOTTOM so newest entries show on bottom!
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

    // Append to bottom (end of array)
    setChatMessages((prev) => [...prev, newMsg]);
    showToast('Dispatch logged to investigator frequency.', 'info');

    // Trigger mobile push & audio chime for radio dispatches
    sendNotification(
      `Radio Dispatch: ${name}`,
      message,
      'chat',
      '/#dispatch'
    );
  };

  // Jump to Rewind tab with specific sighting selected
  const handleSelectSightingForRewind = (sightingId: number) => {
    setActiveTab('rewind');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestNotifications = async () => {
    const res = await requestPermission();
    if (res === 'granted') {
      showToast('Push and mobile alerts enabled for Omaha MUFON.', 'success');
      sendNotification(
        'Alerts Activated',
        'You will now receive notifications for new UAP sightings and radio dispatches.',
        'system'
      );
    } else {
      showToast('Notification permission denied by browser.', 'info');
    }
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

      {/* Floating In-App Real-time Push Toasts */}
      {inAppAlerts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
          {inAppAlerts.map((alert) => (
            <div
              key={alert.id}
              className="pointer-events-auto bg-slate-900/95 border border-cyan-500/60 shadow-2xl rounded-xl p-3.5 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                    {alert.type === 'sighting' ? (
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{alert.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{alert.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{alert.body}</p>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Header following Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        liveCount={aircraft.length}
        receiverStatus={OMAHA_STATION.status}
        onOpenPWAModal={() => setIsPWAModalOpen(true)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        notificationsEnabled={permission === 'granted'}
        onRequestNotifications={handleRequestNotifications}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Main Content Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'radar' && (
          <LiveRadarView
            aircraft={aircraft}
            onSelectForRewind={() => setActiveTab('rewind')}
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
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

      {/* PWA & Notification Setup Modal */}
      <PWAPromptModal
        isOpen={isPWAModalOpen}
        onClose={() => setIsPWAModalOpen(false)}
        onInstall={promptInstall}
        isIOS={isIOS}
        isInstalled={isInstalled}
        notificationsEnabled={permission === 'granted'}
        onRequestNotifications={handleRequestNotifications}
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
            <span>PWA Enabled</span>
            <span>·</span>
            <span>ADS-B 1090 MHz</span>
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
