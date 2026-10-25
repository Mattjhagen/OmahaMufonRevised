import React from 'react';
import { X, Download, Share, PlusSquare, Bell, Navigation, CheckCircle } from 'lucide-react';

interface PWAPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS: boolean;
  isInstalled: boolean;
  notificationsEnabled: boolean;
  onRequestNotifications: () => void;
}

export const PWAPromptModal: React.FC<PWAPromptModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isIOS,
  isInstalled,
  notificationsEnabled,
  onRequestNotifications,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Mobile PWA & Notifications</h3>
              <p className="text-[11px] font-mono text-slate-400">Omaha MUFON Airspace Tracker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Key Mobile Features */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <Bell className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200">Real-Time Mobile Alerts</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  Receive instant push alerts whenever a new field sighting is reported or an urgent radio dispatch is sent.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
              <Navigation className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-slate-200">Field GPS Services</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  One-tap observer location lock, bearing estimation, and automatic reverse geocoding for sighting coordinates.
                </div>
              </div>
            </div>
          </div>

          {/* Notification Permission Card */}
          <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Alert Notifications</span>
                {notificationsEnabled && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {notificationsEnabled
                  ? 'Mobile and browser alerts are enabled for this device.'
                  : 'Enable permissions to receive sighting & dispatch chimes.'}
              </div>
            </div>

            {!notificationsEnabled && (
              <button
                onClick={onRequestNotifications}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0"
              >
                Enable
              </button>
            )}
          </div>

          {/* Installation Instructions */}
          {isInstalled ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 font-mono text-[11px]">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Application is installed and operating in Standalone PWA mode.</span>
            </div>
          ) : isIOS ? (
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 text-slate-300">
              <div className="font-semibold text-white">To install on iOS Safari:</div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li className="flex items-center gap-1.5">
                  <span>1. Tap the Share button</span>
                  <Share className="w-3.5 h-3.5 text-cyan-400 inline" />
                  <span>in Safari's toolbar.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <span>2. Scroll down and tap</span>
                  <span className="text-white font-medium">Add to Home Screen</span>
                  <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" />
                </li>
                <li>3. Launch from your home screen for full standalone experience.</li>
              </ol>
            </div>
          ) : (
            <button
              onClick={onInstall}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Install Omaha MUFON Tracker App</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
