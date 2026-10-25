import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Aircraft, SightingReport } from '../types';

interface AirspaceMapProps {
  aircraft: Aircraft[];
  selectedAircraft?: Aircraft | null;
  onSelectAircraft?: (aircraft: Aircraft) => void;
  activeSighting?: SightingReport | null;
  searchRadiusMiles?: number;
  interactiveSelectCoord?: boolean;
  onSelectCoord?: (lat: number, lon: number) => void;
  heightClass?: string;
}

const OMAHA_CENTER: [number, number] = [41.2565, -95.9345];

export const AirspaceMap: React.FC<AirspaceMapProps> = ({
  aircraft,
  selectedAircraft,
  onSelectAircraft,
  activeSighting,
  searchRadiusMiles = 25,
  interactiveSelectCoord = false,
  onSelectCoord,
  heightClass = 'h-[540px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const aircraftLayerRef = useRef<L.LayerGroup | null>(null);
  const sightingLayerRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: OMAHA_CENTER,
      zoom: 10,
      minZoom: 7,
      maxZoom: 16,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Dark cartographic tiles
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    const aircraftGroup = L.layerGroup().addTo(map);
    const sightingGroup = L.layerGroup().addTo(map);
    const landmarksGroup = L.layerGroup().addTo(map);

    aircraftLayerRef.current = aircraftGroup;
    sightingLayerRef.current = sightingGroup;
    landmarksLayerRef.current = landmarksGroup;
    mapInstanceRef.current = map;

    // Add Omaha aviation landmarks
    const landmarks = [
      { name: 'Eppley Airfield (OMA)', lat: 41.3032, lon: -95.8941, code: 'OMA' },
      { name: 'Offutt AFB (OFF)', lat: 41.1182, lon: -95.9145, code: 'OFF' },
      { name: 'Millard Airport (MLE)', lat: 41.1961, lon: -96.1122, code: 'MLE' },
      { name: 'Omaha Receiver Mast (EN09xv)', lat: 41.2565, lon: -95.9345, code: 'RX-1' },
    ];

    landmarks.forEach((lm) => {
      const landmarkIcon = L.divIcon({
        className: 'landmark-marker',
        html: `
          <div style="display:flex; align-items:center; gap:4px; font-family:'JetBrains Mono',monospace; font-size:10px; color:#94a3b8; background:rgba(15,23,42,0.85); border:1px solid #334155; padding:2px 6px; border-radius:4px; white-space:nowrap;">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
            <span>${lm.code}</span>
          </div>
        `,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });

      L.marker([lm.lat, lm.lon], { icon: landmarkIcon, interactive: true })
        .bindPopup(`<strong>${lm.name}</strong><br><span style="font-size:11px;color:#94a3b8;">Coordinates: ${lm.lat.toFixed(4)}°, ${lm.lon.toFixed(4)}°</span>`)
        .addTo(landmarksGroup);
    });

    // Resize handling
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Click handler for coordinate selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (interactiveSelectCoord && onSelectCoord) {
        onSelectCoord(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [interactiveSelectCoord, onSelectCoord]);

  // Update Aircraft Markers
  useEffect(() => {
    const layer = aircraftLayerRef.current;
    if (!layer) return;

    layer.clearLayers();

    aircraft.forEach((ac) => {
      if (!ac.lat || !ac.lon) return;

      const isDual = ac.sources.includes('adsb') && ac.sources.includes('api');
      const isAdsbOnly = ac.sources.includes('adsb') && !isDual;
      const isSelected = selectedAircraft?.hex === ac.hex;

      // Color coding:
      // Dual: Emerald (#10b981)
      // ADS-B: Laser Cyan (#06b6d4)
      // API: Amber (#f59e0b)
      const color = isDual ? '#10b981' : isAdsbOnly ? '#06b6d4' : '#f59e0b';
      const sourceLabel = isDual ? 'ADS-B + API' : isAdsbOnly ? 'ADS-B' : 'API';
      const heading = ac.track || 0;

      const aircraftSvg = `
        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
          <svg width="26" height="26" viewBox="0 0 24 24" style="transform: rotate(${heading}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
            <path d="M12 2 L15 9 L22 13 L22 15 L14 13 L14 19 L16 21 L16 22 L12 21 L8 22 L8 21 L10 19 L10 13 L2 15 L2 13 L9 9 Z" fill="${color}" stroke="#0f172a" stroke-width="1.2" />
          </svg>
          ${
            isSelected
              ? `<div style="position:absolute; inset:-4px; border:2px solid #38bdf8; border-radius:50%; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
              : ''
          }
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-aircraft-marker',
        html: aircraftSvg,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([ac.lat, ac.lon], { icon });

      const speedStr = ac.ground_speed ? `${Math.round(ac.ground_speed)} kts` : 'N/A';
      const altStr = ac.altitude ? `${ac.altitude.toLocaleString()} ft` : 'Ground';
      const squawkStr = ac.squawk ? `SQ ${ac.squawk}` : 'No squawk';

      marker.bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:180px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="font-size:14px; color:#f8fafc;">${ac.callsign || ac.hex}</strong>
            <span style="font-family:'JetBrains Mono',monospace; font-size:10px; color:${color}; font-weight:600;">[${sourceLabel}]</span>
          </div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:#94a3b8; line-height:1.6;">
            <div>ALT: <span style="color:#f1f5f9;">${altStr}</span> · SPD: <span style="color:#f1f5f9;">${speedStr}</span></div>
            <div>HDG: <span style="color:#f1f5f9;">${ac.track || 0}°</span> · ${squawkStr}</div>
            <div>ICAO: <span style="color:#f1f5f9;">${ac.hex}</span> ${ac.aircraft_type ? `· ${ac.aircraft_type}` : ''}</div>
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectAircraft) {
          onSelectAircraft(ac);
        }
      });

      marker.addTo(layer);
    });
  }, [aircraft, selectedAircraft, onSelectAircraft]);

  // Update Sighting Layer & Correlation Cone
  useEffect(() => {
    const layer = sightingLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    if (activeSighting) {
      const { lat, lon, bearing, reporter_name, type, sighting_time } = activeSighting;

      // Sighting pin
      const sightingHtml = `
        <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
          <div style="width:14px; height:14px; border-radius:50%; background:#f97316; border:2px solid #fff; box-shadow:0 0 10px rgba(249,115,22,0.8);"></div>
          <div style="position:absolute; inset:0; border-radius:50%; border:2px solid #f97316; opacity:0.6; animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
        </div>
      `;

      const sightingIcon = L.divIcon({
        className: 'sighting-marker',
        html: sightingHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([lat, lon], { icon: sightingIcon })
        .bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;">
            <div style="font-size:11px; color:#f97316; font-weight:bold; text-transform:uppercase;">UAP Sighting Location</div>
            <strong style="font-size:13px; color:#f8fafc;">${type}</strong>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
              Witness: ${reporter_name}<br>
              Logged: ${new Date(sighting_time).toLocaleString()}
            </div>
          </div>
        `)
        .addTo(layer);

      // Search Radius circle (miles to meters: 1 mile = 1609.34 meters)
      const radiusMeters = searchRadiusMiles * 1609.34;
      L.circle([lat, lon], {
        radius: radiusMeters,
        color: '#f97316',
        weight: 1.5,
        opacity: 0.6,
        fillColor: '#f97316',
        fillOpacity: 0.05,
        dashArray: '4, 6',
      }).addTo(layer);

      // Bearing ray line if bearing is specified
      if (bearing !== undefined && bearing !== null) {
        const bearingRad = (bearing * Math.PI) / 180;
        const lineDistanceKm = Math.min(searchRadiusMiles * 1.6, 40);
        // Earth radius ~6371km
        const latRad = (lat * Math.PI) / 180;
        const endLat = Math.asin(
          Math.sin(latRad) * Math.cos(lineDistanceKm / 6371) +
            Math.cos(latRad) * Math.sin(lineDistanceKm / 6371) * Math.cos(bearingRad)
        );
        const endLon =
          ((lon * Math.PI) / 180 +
            Math.atan2(
              Math.sin(bearingRad) * Math.sin(lineDistanceKm / 6371) * Math.cos(latRad),
              Math.cos(lineDistanceKm / 6371) - Math.sin(latRad) * Math.sin(endLat)
            )) *
          (180 / Math.PI);

        const endLatDeg = (endLat * 180) / Math.PI;

        L.polyline(
          [
            [lat, lon],
            [endLatDeg, endLon],
          ],
          {
            color: '#f97316',
            weight: 2,
            dashArray: '6, 6',
            opacity: 0.8,
          }
        ).addTo(layer);
      }

      // Center map view on sighting
      map.panTo([lat, lon], { animate: true });
    }
  }, [activeSighting, searchRadiusMiles]);

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Precision Map HUD Legend (clean unboxed typographic elements) */}
      <div className="absolute top-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg px-3.5 py-2.5 shadow-xl text-xs font-mono text-slate-300 pointer-events-none">
        <div className="text-[11px] font-semibold text-slate-200 mb-1.5 uppercase tracking-wider">
          Airspace Key
        </div>
        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span>
            <span>ADS-B Local Receiver</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
            <span>OpenSky Network API</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
            <span>ADS-B + API Merged</span>
          </div>
          {activeSighting && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              <span className="text-orange-400">Sighting & Radius ({searchRadiusMiles}mi)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
