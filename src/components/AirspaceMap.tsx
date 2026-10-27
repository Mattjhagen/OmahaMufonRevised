import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Loader2 } from 'lucide-react';
import { Aircraft, SightingReport, WeatherLayerType } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { detectAircraftType } from '../utils/aircraftType';
import { fetchAircraftPhotoWithCallsignFallback } from '../utils/aircraftPhoto';

interface AirspaceMapProps {
  aircraft: Aircraft[];
  selectedAircraft?: Aircraft | null;
  onSelectAircraft?: (aircraft: Aircraft) => void;
  activeSighting?: SightingReport | null;
  searchRadiusMiles?: number;
  interactiveSelectCoord?: boolean;
  onSelectCoord?: (lat: number, lon: number) => void;
  heightClass?: string;
  weatherLayer?: WeatherLayerType;
  weatherOpacity?: number;
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
  weatherLayer = 'none',
  weatherOpacity = 0.65,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const aircraftLayerRef = useRef<L.LayerGroup | null>(null);
  const sightingLayerRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherTileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapStyle, setMapStyle] = useState<'carto_dark' | 'carto_voyager' | 'carto_positron' | 'osm_standard'>('osm_standard');
  const [cartoKey, setCartoKey] = useState<string | null>(null);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number; locationName: string } | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  const { requestLocation, loading: isGpsLoading, accuracy: gpsAccuracy } = useGeolocation();

  const handleLocateUser = async () => {
    const loc = await requestLocation();
    if (loc && mapInstanceRef.current && userLocationLayerRef.current) {
      setUserLocation(loc);
      mapInstanceRef.current.flyTo([loc.lat, loc.lon], 13, { duration: 1.2 });

      userLocationLayerRef.current.clearLayers();
      const pulseHtml = `
        <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
          <div style="width:14px; height:14px; border-radius:50%; background:#06b6d4; border:2px solid #fff; box-shadow:0 0 12px #06b6d4;"></div>
          <div style="position:absolute; inset:0; border-radius:50%; border:2px solid #06b6d4; opacity:0.6; animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        </div>
      `;
      const locIcon = L.divIcon({
        className: 'user-gps-marker',
        html: pulseHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([loc.lat, loc.lon], { icon: locIcon })
        .bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;">
            <div style="font-size:10px; font-family:'JetBrains Mono',monospace; color:#06b6d4; font-weight:bold; text-transform:uppercase;">Observer GPS Position</div>
            <strong style="font-size:12px; color:#f8fafc;">${loc.locationName}</strong>
            <div style="font-size:11px; color:#94a3b8; margin-top:2px; font-family:'JetBrains Mono',monospace;">
              ${loc.lat.toFixed(4)}°N, ${Math.abs(loc.lon).toFixed(4)}°W
            </div>
          </div>
        `)
        .openPopup()
        .addTo(userLocationLayerRef.current);

      if (gpsAccuracy) {
        L.circle([loc.lat, loc.lon], {
          radius: gpsAccuracy,
          color: '#06b6d4',
          weight: 1,
          opacity: 0.4,
          fillColor: '#06b6d4',
          fillOpacity: 0.08,
        }).addTo(userLocationLayerRef.current);
      }
    }
  };

  // Fetch map configuration (CARTO API key)
  useEffect(() => {
    fetch('/api/map/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.carto?.hasKey && data.carto?.key) {
          setCartoKey(data.carto.key);
        }
      })
      .catch((err) => console.warn('Could not load map config:', err));
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: OMAHA_CENTER,
      zoom: 10,
      minZoom: 7,
      maxZoom: 19,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // OpenStreetMap Standard base (default)
    const baseTile = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: 'abc',
      }
    ).addTo(map);
    baseTileLayerRef.current = baseTile;

    const aircraftGroup = L.layerGroup().addTo(map);
    const sightingGroup = L.layerGroup().addTo(map);
    const landmarksGroup = L.layerGroup().addTo(map);
    const userLocationGroup = L.layerGroup().addTo(map);

    aircraftLayerRef.current = aircraftGroup;
    sightingLayerRef.current = sightingGroup;
    landmarksLayerRef.current = landmarksGroup;
    userLocationLayerRef.current = userLocationGroup;
    mapInstanceRef.current = map;

    // Add Omaha aviation landmarks
    const landmarks = [
      { name: 'Eppley Airfield (OMA)', lat: 41.3032, lon: -95.8941, code: 'OMA' },
      { name: 'Offutt AFB (OFF)', lat: 41.1182, lon: -95.9145, code: 'OFF' },
      { name: 'Millard Airport (MLE)', lat: 41.1961, lon: -96.1122, code: 'MLE' },
      { name: 'Omaha Receiver Mast (EN21ag)', lat: 41.2565, lon: -95.9345, code: 'RX-1' },
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

  // Fetch latest RainViewer radar timestamp
  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((res) => res.json())
      .then((data) => {
        if (data.radar?.past && data.radar.past.length > 0) {
          const latest = data.radar.past[data.radar.past.length - 1].time;
          setRadarTimestamp(latest);
        }
      })
      .catch(() => {
        setRadarTimestamp(Math.floor(Date.now() / 1000) - 600);
      });
  }, []);

  // Switch Basemap Styles (CARTO keyless legacy endpoints + OSM)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    // NOTE: basemaps.cartocdn.com are legacy keyless endpoints - do NOT append API key
    let url = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`;
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
    let subdomains = 'abcd';

    if (mapStyle === 'carto_voyager') {
      url = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png`;
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
    } else if (mapStyle === 'carto_positron') {
      url = `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`;
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>';
    } else if (mapStyle === 'osm_standard') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      subdomains = 'abc';
    }

    const tile = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      subdomains,
    }).addTo(map);

    baseTileLayerRef.current = tile;
  }, [mapStyle, cartoKey]);

  // Update Weather Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (weatherTileLayerRef.current) {
      map.removeLayer(weatherTileLayerRef.current);
      weatherTileLayerRef.current = null;
    }

    if (weatherLayer === 'none') return;

    let tileUrl = '';
    let attribution = '';

    if (weatherLayer === 'doppler' && radarTimestamp) {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;
      attribution = 'Weather &copy; RainViewer / NOAA NEXRAD';
    } else if (weatherLayer === 'clouds') {
      tileUrl = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2`;
      attribution = 'Cloud Cover &copy; OpenWeatherMap';
    } else if (weatherLayer === 'precipitation') {
      tileUrl = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2`;
      attribution = 'Precipitation &copy; OpenWeatherMap';
    } else if (weatherLayer === 'wind') {
      tileUrl = `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2`;
      attribution = 'Wind &copy; OpenWeatherMap';
    } else if (weatherLayer === 'temp') {
      tileUrl = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2`;
      attribution = 'Temperature &copy; OpenWeatherMap';
    }

    if (tileUrl) {
      const tileLayer = L.tileLayer(tileUrl, {
        opacity: weatherOpacity,
        zIndex: 10,
        attribution,
      });
      tileLayer.addTo(map);
      weatherTileLayerRef.current = tileLayer;
    }

    return () => {
      if (map && weatherTileLayerRef.current) {
        map.removeLayer(weatherTileLayerRef.current);
        weatherTileLayerRef.current = null;
      }
    };
  }, [weatherLayer, weatherOpacity, radarTimestamp]);

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

      // Detect aircraft type
      const typeInfo = detectAircraftType(ac);
      const isHelicopter = typeInfo.category === 'helicopter';

      // Choose appropriate icon based on type
      let aircraftIcon: string;
      if (isHelicopter) {
        // Helicopter icon with rotating rotor animation
        aircraftIcon = `
          <svg width="26" height="26" viewBox="0 0 24 24" style="transform: rotate(${heading}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
            <!-- Fuselage -->
            <ellipse cx="12" cy="13" rx="3.5" ry="5" fill="${color}" stroke="#0f172a" stroke-width="1.2" />
            <!-- Tail boom -->
            <rect x="11" y="17" width="2" height="5" fill="${color}" stroke="#0f172a" stroke-width="1" />
            <!-- Tail rotor -->
            <circle cx="12" cy="22.5" r="1.5" fill="${color}" stroke="#0f172a" stroke-width="0.8" />
            <!-- Skids -->
            <line x1="8" y1="18" x2="10" y2="16" stroke="#0f172a" stroke-width="1.2" stroke-linecap="round" />
            <line x1="16" y1="18" x2="14" y2="16" stroke="#0f172a" stroke-width="1.2" stroke-linecap="round" />
            <line x1="7" y1="18" x2="17" y1="18" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <!-- Rotor blade (animated) -->
          <svg width="26" height="26" viewBox="0 0 24 24" style="position:absolute; top:0; left:0; pointer-events:none;">
            <line x1="3" y1="8" x2="21" y2="8" stroke="${color}" stroke-width="1.5" stroke-linecap="round"
                  style="transform-origin: 12px 8px; animation: rotor-spin 0.15s linear infinite;" />
          </svg>
        `;
      } else if (typeInfo.category === 'unknown') {
        // Unknown type - simple dot
        aircraftIcon = `
          <svg width="26" height="26" viewBox="0 0 24 24" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
            <circle cx="12" cy="12" r="5" fill="${color}" stroke="#0f172a" stroke-width="1.5" />
            <circle cx="12" cy="12" r="2" fill="#0f172a" opacity="0.4" />
          </svg>
        `;
      } else {
        // Fixed-wing aircraft (default plane icon)
        aircraftIcon = `
          <svg width="26" height="26" viewBox="0 0 24 24" style="transform: rotate(${heading}deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
            <path d="M12 2 L15 9 L22 13 L22 15 L14 13 L14 19 L16 21 L16 22 L12 21 L8 22 L8 21 L10 19 L10 13 L2 15 L2 13 L9 9 Z" fill="${color}" stroke="#0f172a" stroke-width="1.2" />
          </svg>
        `;
      }

      const aircraftSvg = `
        <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
          ${aircraftIcon}
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

      // Helper to build popup HTML
      const buildPopupHTML = (photoURL?: string, photographer?: string, planespottersLink?: string, loading?: boolean) => `
        <div style="font-family:'Plus Jakarta Sans',sans-serif; min-width:200px; max-width:280px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="font-size:14px; color:#f8fafc;">${ac.callsign || ac.hex}</strong>
            <span style="font-family:'JetBrains Mono',monospace; font-size:10px; color:${color}; font-weight:600;">[${sourceLabel}]</span>
          </div>
          ${loading ? `
            <div style="margin-bottom:8px; padding:20px; text-align:center; color:#22d3ee; font-size:11px;">
              Loading photo...
            </div>
          ` : photoURL ? `
            <div style="margin-bottom:8px;">
              <img src="${photoURL}" alt="Aircraft" style="width:100%; border-radius:6px; border:1px solid #475569;" />
              <div style="margin-top:4px; font-size:10px; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
                <span>Photo: <span style="color:#22d3ee;">${photographer || 'Unknown'}</span></span>
                ${planespottersLink ? `<a href="${planespottersLink}" target="_blank" rel="noopener noreferrer" style="color:#22d3ee; text-decoration:none;">Planespotters ↗</a>` : ''}
              </div>
            </div>
          ` : ''}
          <div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:#94a3b8; line-height:1.6;">
            <div>ALT: <span style="color:#f1f5f9;">${altStr}</span> · SPD: <span style="color:#f1f5f9;">${speedStr}</span></div>
            <div>HDG: <span style="color:#f1f5f9;">${ac.track || 0}°</span> · ${squawkStr}</div>
            <div>ICAO: <span style="color:#f1f5f9;">${ac.hex}</span> ${ac.aircraft_type ? `· ${ac.aircraft_type}` : ''}</div>
          </div>
        </div>
      `;

      // Initial popup without photo
      marker.bindPopup(buildPopupHTML());

      // Track if photo has been fetched for this marker
      let photoFetched = false;

      // Fetch photo only when popup opens (not for every marker upfront)
      marker.on('popupopen', () => {
        if (!photoFetched) {
          photoFetched = true;
          marker.setPopupContent(buildPopupHTML(undefined, undefined, undefined, true));

          fetchAircraftPhotoWithCallsignFallback({
            hex: ac.hex,
            registration: ac.registration || null,
            callsign: ac.callsign || undefined,
          }).then((photo) => {
            if (photo) {
              marker.setPopupContent(buildPopupHTML(photo.url, photo.photographer, photo.link));
            } else {
              // Revert to no photo state (remove loading)
              marker.setPopupContent(buildPopupHTML());
            }
          }).catch((err) => {
            console.error('[MAP POPUP] Photo fetch failed for', ac.hex, err);
            marker.setPopupContent(buildPopupHTML());
          });
        }
      });

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
      
      {/* Basemap & CARTO Engine Selector */}
      <div className="absolute top-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg p-1 shadow-xl flex items-center gap-1 text-[11px] font-mono">
        <span className="text-slate-400 px-1.5 uppercase font-semibold text-[10px] hidden sm:inline">Basemap:</span>
        <button
          type="button"
          onClick={() => setMapStyle('carto_dark')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapStyle === 'carto_dark'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          title="CARTO Dark Matter (Night Surveillance Base)"
        >
          CARTO Dark
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('carto_voyager')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapStyle === 'carto_voyager'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          title="CARTO Voyager Tactical with Landmarks"
        >
          CARTO Voyager
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('carto_positron')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapStyle === 'carto_positron'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          title="CARTO Positron Light"
        >
          CARTO Light
        </button>
        <button
          type="button"
          onClick={() => setMapStyle('osm_standard')}
          className={`px-2 py-0.5 rounded transition-colors ${
            mapStyle === 'osm_standard'
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
          title="OpenStreetMap Standard Street Base"
        >
          OSM
        </button>

        <div className="h-3.5 w-px bg-slate-800 mx-1" />
        <button
          type="button"
          onClick={handleLocateUser}
          disabled={isGpsLoading}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 hover:text-white transition-colors disabled:opacity-50"
          title="Locate my position via device GPS and center airspace map"
        >
          {isGpsLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Navigation className="w-3 h-3" />
          )}
          <span>{isGpsLoading ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>

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
          {weatherLayer !== 'none' && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400"></span>
              <span className="text-sky-300 capitalize">OpenWeather: {weatherLayer} Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
