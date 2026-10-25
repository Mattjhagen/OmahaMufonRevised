import React, { useState } from 'react';
import { Radio, Database, ShieldCheck, Box, Palette, Type, Navigation, Cpu, CheckCircle2 } from 'lucide-react';
import { OMAHA_STATION } from '../data/initialData';
import { Sighting3DViewer } from './Sighting3DViewer';

export const StationInfoView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'station' | '3dlab' | 'design_system'>('station');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span>OMAHA CHAPTER · SCIENTIFIC CORRELATION & TECHNICAL ARCHITECTURE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Station Telemetry & Design Architecture
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Technical specifications of the Omaha receiver, 3D silhouette inspection lab, and modern design constitution.
          </p>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('station')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeSubTab === 'station'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Station Specs
          </button>
          <button
            onClick={() => setActiveSubTab('3dlab')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeSubTab === '3dlab'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D PBR Lab</span>
          </button>
          <button
            onClick={() => setActiveSubTab('design_system')}
            className={`px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 ${
              activeSubTab === 'design_system'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Design Blueprint</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Station Hardware & Airspace Methodology */}
      {activeSubTab === 'station' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <Radio className="w-4 h-4" />
                <span>RECEIVER CALLSIGN</span>
              </div>
              <div className="text-xl font-bold text-white font-mono">{OMAHA_STATION.callsign}</div>
              <div className="text-xs text-slate-400">Grid: {OMAHA_STATION.gridSquare} · Omaha, NE</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                <span>HARDWARE LAYER</span>
              </div>
              <div className="text-base font-bold text-white">FR24 + FlightAware</div>
              <div className="text-xs text-slate-400">1090 MHz Collinear Omni (Roof Mast)</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>RECORDER ARCHIVE</span>
              </div>
              <div className="text-xl font-bold text-white font-mono">{OMAHA_STATION.retentionDays} Days</div>
              <div className="text-xs text-slate-400">Rolling window · Auto-prune</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>STATION STATUS</span>
              </div>
              <div className="text-xl font-bold text-emerald-400 font-mono">ONLINE (NOMINAL)</div>
              <div className="text-xs text-slate-400">Range: ~{OMAHA_STATION.adsbCoverageRadiusMi} nautical miles</div>
            </div>
          </div>

          {/* Scientific Methodology & Language Rules */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              Scientific Correlation & Language Discipline
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Omaha MUFON utilizes dual-layer data fusion combining local line-of-sight 1090 MHz ADS-B telemetry with OpenSky Network API polling. Sighting reports are correlated by cross-referencing witness observation coordinates and timestamps against historical aircraft tracks within a defined radius and ±10 minute temporal buffer.
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="text-xs font-mono text-amber-400 uppercase tracking-wider font-semibold">
                Mandatory Investigative Wording Policy
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                When aircraft correlation finds no ADS-B or API match for a sighting, the system exclusively reports:
              </p>
              <blockquote className="text-sm font-mono text-amber-300 bg-amber-950/30 border border-amber-800/60 rounded-lg p-3">
                &ldquo;No ADS-B match found — No cooperative aircraft broadcasting ADS-B detected in the specified area and time window. Non-cooperative aircraft, military traffic, and coverage gaps are routine.&rdquo;
              </blockquote>
              <p className="text-xs text-slate-400">
                The absence of a match never proves anomalous craft; civilian ADS-B receivers do not detect non-transponder targets, stealth aircraft, or objects below topographical radar horizon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: 3D Silhouette Inspector */}
      {activeSubTab === '3dlab' && (
        <div className="space-y-4">
          <Sighting3DViewer initialModel="triangle" />
        </div>
      )}

      {/* Sub-tab 3: Comprehensive Design Blueprint & Professional Recommendations */}
      {activeSubTab === 'design_system' && (
        <div className="space-y-8">
          {/* Section 1: Navigation Structure Proposal */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Navigation className="w-4 h-4" />
              <span>NAVIGATION ARCHITECTURE REVIEW & PROPOSAL</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                1. Revised, Intuitive Navigation Structure
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The previous site suffered from fractured views (feed vs map modal, cramped 8px retro buttons, buried sighting detail). Below is the proposed, modern informational/scientific hierarchy:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-cyan-400 font-bold text-sm">Primary Top Bar Contract (1 Row, 3 Zones)</div>
                <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                  <li><strong>Zone 1 (Brand Wordmark):</strong> Omaha MUFON Airspace Tracker</li>
                  <li><strong>Zone 2 (Clean Single-Line Tabs):</strong>
                    <div className="ml-4 mt-1 space-y-1 text-slate-400">
                      <div>· <strong>Live Radar:</strong> Real-time airspace monitor & flight list</div>
                      <div>· <strong>Rewind & Correlate:</strong> Time scrubber & historical match engine</div>
                      <div>· <strong>Sighting Archive:</strong> Catalog of witness reports & photos</div>
                      <div>· <strong>Field Dispatch:</strong> Real-time observer logs & alerts</div>
                      <div>· <strong>Station Info:</strong> Hardware specs, 3D lab, & chapter standards</div>
                    </div>
                  </li>
                  <li><strong>Zone 3 (Primary Action):</strong> Report Sighting (Prominent CTA modal)</li>
                </ul>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-emerald-400 font-bold text-sm">Information Architecture Benefits</div>
                <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                  <li><strong>Zero Dead Clicks:</strong> Every tab directly navigates to a rich, dedicated workspace.</li>
                  <li><strong>Context Preservation:</strong> Sighting reports link directly into the Rewind correlation engine with one click.</li>
                  <li><strong>Mobile Viewport Discipline:</strong> Responsive horizontal scroll ribbon that stays below 15% mobile viewport cap.</li>
                  <li><strong>Separation of Concerns:</strong> Real-time operational data is decoupled from historical investigation records.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 2: Color Palette Specification */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Palette className="w-4 h-4" />
              <span>MODERN PROFESSIONAL COLOR PALETTE (60-30-10 RULE)</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                2. Calibrated Color Palette with Specific HEX Codes
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                To replace harsh retro cyan terminals and neon slop, we implement an empirical aerospace palette meeting WCAG AA contrast (minimum 4.5:1 text contrast).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">Deep Obsidian (60%)</span>
                  <span className="w-5 h-5 rounded bg-[#070B14] border border-slate-700"></span>
                </div>
                <div className="text-xs font-mono text-cyan-400">#070B14 / #0B0F19</div>
                <p className="text-[11px] text-slate-400">
                  Primary canvas. Deep astronomical slate that eliminates eye strain during nocturnal field watches.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">Structural Slate (30%)</span>
                  <span className="w-5 h-5 rounded bg-[#0F172A] border border-slate-700"></span>
                </div>
                <div className="text-xs font-mono text-cyan-400">#0F172A / Border #1E293B</div>
                <p className="text-[11px] text-slate-400">
                  Card surfaces and 1px hairline dividers. Crisp geometry with zero tacky gradients.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">Laser Cyan Accent (10%)</span>
                  <span className="w-5 h-5 rounded bg-[#06B6D4]"></span>
                </div>
                <div className="text-xs font-mono text-cyan-400">#06B6D4 (Light: #38BDF8)</div>
                <p className="text-[11px] text-slate-400">
                  Primary action buttons, active navigation markers, and local ADS-B hardware tracks.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">Telemetry Amber</span>
                  <span className="w-5 h-5 rounded bg-[#F59E0B]"></span>
                </div>
                <div className="text-xs font-mono text-amber-400">#F59E0B</div>
                <p className="text-[11px] text-slate-400">
                  API aircraft fill-ins, caution banners, and &ldquo;No ADS-B match found&rdquo; status indicators.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">Verification Emerald</span>
                  <span className="w-5 h-5 rounded bg-[#10B981]"></span>
                </div>
                <div className="text-xs font-mono text-emerald-400">#10B981</div>
                <p className="text-[11px] text-slate-400">
                  Dual-source merged aircraft ([ADS-B + API]) and positive flight correlation confirmations.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">High-Legibility Type</span>
                  <span className="w-5 h-5 rounded bg-[#F8FAFC]"></span>
                </div>
                <div className="text-xs font-mono text-slate-300">#F8FAFC / #94A3B8</div>
                <p className="text-[11px] text-slate-400">
                  High-contrast body text (14.5:1 ratio) and muted secondary labels (7.2:1 ratio).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Typography System Recommendation */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <Type className="w-4 h-4" />
              <span>TYPOGRAPHY SYSTEM & RESPONSIVE TYPE SCALE</span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">
                3. Font Pairings, Scale, and Line-Heights
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Replacing cramped 8px/10px monospace throughout the UI with the 2+1 Font Rule:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="font-bold text-white text-sm">Font Family Pairing</div>
                <div className="space-y-2 text-slate-300">
                  <div>
                    <strong className="text-cyan-400">Headings & UI:</strong> <code className="text-white">Plus Jakarta Sans</code> (SemiBold 600, Bold 700). Geometric neo-grotesque with broad apertures, high x-height, and superior legibility at all scales.
                  </div>
                  <div>
                    <strong className="text-cyan-400">Body & Narratives:</strong> <code className="text-white">Plus Jakarta Sans</code> (Regular 400). High x-height with comfortable 1.6 line-height for reading long eyewitness accounts without eye fatigue.
                  </div>
                  <div>
                    <strong className="text-cyan-400">Telemetry & Coordinates:</strong> <code className="text-white">JetBrains Mono</code> with <code className="text-white">tabular-nums</code>. Dedicated tabular alignment preventing layout jitter on fluctuating speed, altitude, and heading readings.
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="font-bold text-white text-sm">Recommended Responsive Scale</div>
                <div className="font-mono text-[11px] space-y-1.5 text-slate-400">
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-200">Hero / Display Title:</span>
                    <span>28px - 36px (1.2 line-height)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-200">Section Headings:</span>
                    <span>20px - 24px (1.3 line-height)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-200">Card Titles & Subheads:</span>
                    <span>16px - 18px (1.4 line-height)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/80 pb-1">
                    <span className="text-slate-200">Body Narrative:</span>
                    <span>14px - 15px (1.6 line-height, 65-75ch)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-200">Telemetry Labels & Squawk:</span>
                    <span>11px - 12px (font-mono tabular-nums)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
