import React, { useState } from 'react';
import { Send, MessageSquare, AlertTriangle, CloudSun, Shield, User } from 'lucide-react';
import { ChatMessage } from '../types';

interface FieldDispatchViewProps {
  messages: ChatMessage[];
  onSendMessage: (name: string, role: string, message: string, tag: 'alert' | 'sighting' | 'weather' | 'general') => void;
}

export const FieldDispatchView: React.FC<FieldDispatchViewProps> = ({
  messages,
  onSendMessage,
}) => {
  const [name, setName] = useState('Investigator Guest');
  const [role, setRole] = useState('Field Investigator');
  const [messageText, setMessageText] = useState('');
  const [selectedTag, setSelectedTag] = useState<'alert' | 'sighting' | 'weather' | 'general'>('general');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    onSendMessage(name.trim() || 'Anonymous Spotter', role, messageText.trim(), selectedTag);
    setMessageText('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>COMMUNITY SIGHTING LOG & INVESTIGATOR DISPATCH · FREQ 1090</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Field Investigator Dispatch
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time collaboration channel for Omaha skywatchers, MUFON field investigators, and regional observers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>DISPATCH ENCRYPTED · LIVE</span>
        </div>
      </div>

      {/* Main Grid: Message Stream (7 cols) + Dispatch Input & Protocols (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Message Feed */}
        <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col h-[580px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Active Transmissions ({messages.length})
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Auto-archive 90 days
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 py-4 pr-1">
            {messages.map((msg) => {
              const isAlert = msg.tag === 'alert';
              const isWeather = msg.tag === 'weather';
              const isSighting = msg.tag === 'sighting';

              return (
                <div
                  key={msg.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{msg.name}</span>
                      {msg.role && (
                        <span className="text-[11px] font-mono text-slate-400">
                          [{msg.role}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isAlert && (
                        <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
                          ALERT
                        </span>
                      )}
                      {isWeather && (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                          METEOROLOGY
                        </span>
                      )}
                      {isSighting && (
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                          SIGHTING
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {msg.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick Input Bar */}
          <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Channel:</span>
              {(['general', 'sighting', 'weather', 'alert'] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 text-xs font-mono rounded capitalize transition-colors ${
                    selectedTag === tag
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Post an observation, radar anomaly notice, or sky conditions..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Dispatch Settings & Investigation Protocol */}
        <div className="lg:col-span-4 space-y-4">
          {/* Identity Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-semibold text-white">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Investigator Profile</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                  Callsign / Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                  Chapter Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Field Investigator">Field Investigator</option>
                  <option value="Amateur Astronomer">Amateur Astronomer</option>
                  <option value="Skywatch Lead">Skywatch Lead</option>
                  <option value="Aviation Analyst">Aviation Analyst</option>
                  <option value="State Section Director">State Section Director</option>
                  <option value="Civilian Spotter">Civilian Spotter</option>
                </select>
              </div>
            </div>
          </div>

          {/* Investigation Rules */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-sm font-semibold text-white">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Scientific Reporting Protocol</span>
            </div>

            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>
                <strong className="text-slate-200">1. Objective Grounding:</strong> Always correlate initial observations against the Live Radar before logging anomalous motion.
              </p>
              <p>
                <strong className="text-slate-200">2. No Unverified Labels:</strong> If an observation has no matching transponder, state &ldquo;No ADS-B match found&rdquo;. Do not assume alien craft.
              </p>
              <p>
                <strong className="text-slate-200">3. Celestial Checks:</strong> Check star charts for Jupiter, Venus, or satellite trains (Starlink) before escalating sightings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
