import React, { useState } from 'react';
import { X, MapPin, Compass, Camera, Upload, AlertCircle } from 'lucide-react';
import { SightingReport, SightingType } from '../types';

interface ReportSightingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Omit<SightingReport, 'id' | 'created_at'>) => void;
}

const SIGHTING_TYPES: SightingType[] = [
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

export const ReportSightingModal: React.FC<ReportSightingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [reporterName, setReporterName] = useState('');
  const [reporterRole, setReporterRole] = useState('Civilian Witness');
  const [sightingTime, setSightingTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [lat, setLat] = useState<number>(41.2565);
  const [lon, setLon] = useState<number>(-95.9345);
  const [locationText, setLocationText] = useState('Omaha Metro, Douglas County, NE');
  const [bearing, setBearing] = useState<number>(180);
  const [elevation, setElevation] = useState<number>(35);
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('1-2 minutes');
  const [type, setType] = useState<SightingType>('Triangle');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterName.trim() || !description.trim()) return;

    onSubmit({
      reporter_name: reporterName.trim(),
      reporter_role: reporterRole,
      sighting_time: new Date(sightingTime).toISOString(),
      lat,
      lon,
      location_text: locationText.trim(),
      bearing,
      elevation,
      description: description.trim(),
      duration,
      type,
      photo_path: photoPreview || undefined,
      correlation_status: 'pending',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Report Aerial Phenomenon (UAP)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit sighting report for Omaha MUFON cross-correlation against ADS-B logs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Witness Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Observer Name *
              </label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Full name or initials"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Observer Background
              </label>
              <select
                value={reporterRole}
                onChange={(e) => setReporterRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="Civilian Witness">Civilian Witness</option>
                <option value="Amateur Astronomer">Amateur Astronomer</option>
                <option value="Field Investigator">Field Investigator</option>
                <option value="Commercial / Private Pilot">Commercial / Private Pilot</option>
                <option value="Military / Veteran">Military / Veteran</option>
                <option value="Law Enforcement">Law Enforcement</option>
              </select>
            </div>
          </div>

          {/* Time & Shape Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Observation Date & Time (Local) *
              </label>
              <input
                type="datetime-local"
                required
                value={sightingTime}
                onChange={(e) => setSightingTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Apparent Silhouette / Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as SightingType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
              >
                {SIGHTING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Text & Lat/Lon Coordinates */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Observation Location Description
              </label>
              <input
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                placeholder="e.g. Bellevue bluffs, West Dodge corridor, Eppley flight path..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                  Longitude (°W)
                </label>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 font-mono tabular-nums focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Compass Bearing & Elevation Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compass Bearing</span>
                </span>
                <span className="font-semibold text-cyan-400">{bearing}° ({getCompassLabel(bearing)})</span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                value={bearing}
                onChange={(e) => setBearing(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Elevation Angle</span>
                <span className="font-semibold text-cyan-400">{elevation}° (0° horiz - 90° zenith)</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={elevation}
                onChange={(e) => setElevation(parseInt(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Narrative Description */}
          <div>
            <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
              Detailed Narrative Description *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe color, apparent size, motion characteristics (steady, hovering, zigzag), sound, lights, weather conditions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Duration & Photo Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Estimated Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 45 seconds, 3 minutes"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Attach Photographic Evidence
              </label>
              <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg cursor-pointer text-xs text-slate-300">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Upload Photo / Capture</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Photo preview */}
          {photoPreview && (
            <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-800">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-2 right-2 p-1 bg-slate-950/80 rounded text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-md"
            >
              Submit Report to Archive
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function getCompassLabel(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((degrees % 360) / 45) % 8;
  return directions[index];
}
