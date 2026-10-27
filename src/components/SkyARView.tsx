import React, { useState, useEffect, useRef } from 'react';
import { Camera, Navigation, Activity, Wifi, X, AlertTriangle, CheckCircle2, Loader2, Maximize, Minimize, HelpCircle } from 'lucide-react';
import { Aircraft } from '../types';
import { detectAircraftType, getCategoryLabel, getCategoryIcon } from '../utils/aircraftType';
import { buildFlightradar24URL, getFlightradar24LinkText } from '../utils/flightradar24';
import { fetchAircraftPhotoWithCallsignFallback, AircraftPhoto } from '../utils/aircraftPhoto';

interface SkyARViewProps {
  aircraft: Aircraft[];
}

interface WardrivingGridCell {
  grid_lat: number;
  grid_lon: number;
  network_count: number;
  channel_breakdown: string;
}

interface WardrivingSummary {
  total_wifi_observations: number;
  unique_wifi_macs: number;
  grid_cells: number;
}

interface ARLabel {
  id: string;
  type: 'aircraft' | 'wifi';
  title: string;
  subtitle: string;
  distance: number;
  bearing: number;
  elevation: number;
  x: number;
  y: number;
  inView: boolean;
  // Aircraft-specific data for photo card
  hex?: string;
  registration?: string;
  callsign?: string;
  altitude?: number;
  category?: string;
  isHelicopter?: boolean;  // For hover bob animation
}

const OMAHA_CENTER: [number, number] = [41.2565, -95.9345];
const OMAHA_GROUND_ELEVATION_FT = 1090;
const MAX_DISTANCE_MILES = 50;
const HORIZONTAL_FOV_DEG = 65;

// Haversine distance in miles
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Initial bearing (degrees)
function initialBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Elevation angle from observer to target
function elevationAngle(
  observerLat: number,
  observerLon: number,
  observerAltFt: number,
  targetLat: number,
  targetLon: number,
  targetAltFt: number
): number {
  const distanceMiles = haversineDistance(observerLat, observerLon, targetLat, targetLon);
  const distanceFt = distanceMiles * 5280;
  const altDiff = targetAltFt - observerAltFt;
  return (Math.atan2(altDiff, distanceFt) * 180) / Math.PI;
}

export const SkyARView: React.FC<SkyARViewProps> = ({ aircraft }) => {
  const [arActive, setArActive] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [userAltitude, setUserAltitude] = useState<number>(OMAHA_GROUND_ELEVATION_FT);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [devicePitch, setDevicePitch] = useState<number>(0);
  const [deviceRoll, setDeviceRoll] = useState<number>(0);
  const [compassAccuracy, setCompassAccuracy] = useState<number | null>(null);
  const [calibrationNeeded, setCalibrationNeeded] = useState(false);
  const [showWardrivingLayer, setShowWardrivingLayer] = useState(false);
  const [wardrivingData, setWardrivingData] = useState<WardrivingGridCell[]>([]);
  const [wardrivingSummary, setWardrivingSummary] = useState<WardrivingSummary | null>(null);
  const [wardrivingAvailable, setWardrivingAvailable] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedAircraft, setSelectedAircraft] = useState<ARLabel | null>(null);
  const [aircraftPhoto, setAircraftPhoto] = useState<AircraftPhoto | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arContainerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const orientationHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const userLocationRef = useRef<GeolocationCoordinates | null>(null);
  const deviceHeadingRef = useRef<number>(0);
  const currentLabelsRef = useRef<ARLabel[]>([]);

  // Sync state to refs for render loop (avoid stale closure)
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    deviceHeadingRef.current = deviceHeading;
  }, [deviceHeading]);

  // Attach stream to video and play when video element mounts
  useEffect(() => {
    const attachStreamAndPlay = async () => {
      if (!arActive || !streamRef.current || !videoRef.current) {
        console.log('[ATTACH] Waiting... arActive:', arActive, 'stream:', !!streamRef.current, 'video:', !!videoRef.current);
        return;
      }

      const video = videoRef.current;
      const stream = streamRef.current;

      // Check if already attached
      if (video.srcObject === stream) {
        console.log('[ATTACH] Stream already attached, skipping');
        return;
      }

      console.log('[ATTACH] Video element now exists, attaching stream...');
      video.srcObject = stream;

      console.log('[ATTACH] Video element readyState:', video.readyState);
      console.log('[ATTACH] Video element dimensions:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        clientWidth: video.clientWidth,
        clientHeight: video.clientHeight,
      });

      // Explicitly play the video
      try {
        console.log('[ATTACH] Calling video.play()...');
        await video.play();
        console.log('[ATTACH] video.play() RESOLVED successfully');
        console.log('[ATTACH] Video paused after play?:', video.paused);
      } catch (playErr: any) {
        console.error('[ATTACH] video.play() REJECTED:', playErr);
        setCameraError(`Video play failed: ${playErr.message}`);
      }
    };

    attachStreamAndPlay();
  }, [arActive, streamRef.current, videoRef.current]);

  // Resize canvas to match video size
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && videoRef.current) {
        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvasRef.current.width = video.videoWidth;
          canvasRef.current.height = video.videoHeight;
        }
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('loadedmetadata', resizeCanvas);
    }

    window.addEventListener('resize', resizeCanvas);

    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', resizeCanvas);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [arActive]);

  // Fetch wardriving data on mount
  useEffect(() => {
    fetchWardrivingData();
  }, []);

  // Check if tutorial has been seen (first run)
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('skyar-tutorial-seen');
    if (!hasSeenTutorial && !arActive) {
      // Don't show immediately - wait for user interaction
      // Tutorial will show after AR is started for the first time
    }
  }, []);

  const fetchWardrivingData = async () => {
    try {
      const [summaryRes, heatmapRes] = await Promise.all([
        fetch('/api/wardriving/summary'),
        fetch('/api/wardriving/heatmap'),
      ]);

      if (summaryRes.ok && heatmapRes.ok) {
        const summary = await summaryRes.json();
        const heatmap = await heatmapRes.json();

        if (summary && heatmap && Array.isArray(heatmap) && heatmap.length > 0) {
          setWardrivingSummary(summary);
          setWardrivingData(heatmap);
          setWardrivingAvailable(true);
        }
      }
    } catch (err) {
      console.warn('Wardriving data unavailable:', err);
    }
  };

  // Request permissions and start AR
  const startAR = async () => {
    try {
      console.log('[AR START] Requesting camera...');

      // Request camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });

      console.log('[AR START] Camera acquired, stream active:', stream.active);
      console.log('[AR START] Video tracks:', stream.getVideoTracks().map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        label: t.label
      })));

      // Store stream immediately (before video element exists)
      streamRef.current = stream;
      console.log('[AR START] Stream stored in ref');

      // Set UI to active immediately so React renders the video element
      console.log('[AR START] Setting UI state to active (video element will mount next)...');
      setPermissionsGranted(true);
      setArActive(true);
      setCameraError(null);

      // Request GPS (non-blocking)
      console.log('[AR START] Requesting GPS location...');

      if (!navigator.geolocation) {
        console.error('[AR START] Geolocation not supported');
        setSensorError('GPS not supported by this device');
      } else {
        const geoOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for outdoor acquisition
          maximumAge: 0,
        };

        console.log('[AR START] Calling watchPosition with options:', geoOptions);

        const geoWatchId = navigator.geolocation.watchPosition(
          (position) => {
            console.log('[GPS] GPS SUCCESS - Position acquired:', {
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude
            });
            setUserLocation(position.coords);
            if (position.coords.altitude) {
              setUserAltitude(position.coords.altitude * 3.28084); // meters to feet
            }
            setSensorError(null); // Clear sensor error on GPS success
          },
          (error) => {
            console.error('[GPS] GPS ERROR:', error.code, error.message);
            console.error('[GPS] Error details:', {
              PERMISSION_DENIED: error.code === 1,
              POSITION_UNAVAILABLE: error.code === 2,
              TIMEOUT: error.code === 3
            });
            setSensorError(`GPS: ${error.message} (code ${error.code})`);
          },
          geoOptions
        );

        console.log('[AR START] watchPosition called, watch ID:', geoWatchId);
        geoWatchIdRef.current = geoWatchId;
      }

      // Request DeviceOrientation (iOS needs permission, non-blocking)
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission !== 'granted') {
            setSensorError('Compass permission denied - AR labels disabled');
            // Don't return - show camera feed anyway
          }
        } catch (err) {
          setSensorError('Compass not available - AR labels disabled');
          // Don't return - show camera feed anyway
        }
      }

      // Set up orientation listener
      const orientationHandler = (event: DeviceOrientationEvent) => {
        if (event.alpha !== null) {
          // Compass heading (0-360)
          setDeviceHeading(event.alpha);

          // webkitCompassAccuracy is iOS-specific extension
          const accuracy = (event as any).webkitCompassAccuracy;
          setCompassAccuracy(accuracy || null);

          // Check if calibration needed (iOS reports accuracy, Android doesn't)
          if (accuracy && accuracy > 20) {
            setCalibrationNeeded(true);
          } else {
            setCalibrationNeeded(false);
          }
        }
        if (event.beta !== null) setDevicePitch(event.beta);
        if (event.gamma !== null) setDeviceRoll(event.gamma);
      };

      window.addEventListener('deviceorientation', orientationHandler);
      orientationHandlerRef.current = orientationHandler;

      // Render loop will start when canvas mounts (see useEffect below)
      console.log('[AR START] Setup complete, waiting for canvas to mount...');

      // Show tutorial on first run (after AR is active and camera is working)
      const hasSeenTutorial = localStorage.getItem('skyar-tutorial-seen');
      if (!hasSeenTutorial) {
        setTimeout(() => {
          setShowTutorial(true);
        }, 2000); // Show after 2 seconds to let user see AR working first
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied');
      console.error('AR start error:', err);
    }
  };

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('skyar-tutorial-seen', 'true');
  };

  // Stop AR
  const stopAR = () => {
    setArActive(false);

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Stop GPS
    if (geoWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }

    // Stop orientation
    if (orientationHandlerRef.current) {
      window.removeEventListener('deviceorientation', orientationHandlerRef.current);
      orientationHandlerRef.current = null;
    }

    // Stop render loop
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Handle canvas click to detect label taps
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Convert click coords to canvas space
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Check if click is within any label's hit area (larger radius for bigger labels)
    const hitRadius = 120; // Increased from 80px for bigger labels
    const labels = currentLabelsRef.current;

    for (const label of labels) {
      if (label.type !== 'aircraft') continue; // Only aircraft labels are tappable

      const dx = canvasX - label.x;
      const dy = canvasY - label.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= hitRadius) {
        setSelectedAircraft(label);
        fetchAircraftPhoto(label);
        return;
      }
    }
  };

  // Fetch aircraft photo from Planespotters via shared proxy utility
  const fetchAircraftPhoto = async (label: ARLabel) => {
    if (!label.hex) {
      console.warn('[PHOTO] No hex available for aircraft, cannot fetch photo');
      return;
    }

    setPhotoLoading(true);
    setAircraftPhoto(null);

    const photo = await fetchAircraftPhotoWithCallsignFallback({
      hex: label.hex,
      registration: label.registration || null,
      callsign: label.callsign || undefined,
    });

    setAircraftPhoto(photo);
    setPhotoLoading(false);
  };

  // Enter fullscreen
  const enterFullscreen = async () => {
    if (!arContainerRef.current) return;

    try {
      // Try Fullscreen API first
      if (arContainerRef.current.requestFullscreen) {
        await arContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if ((arContainerRef.current as any).webkitRequestFullscreen) {
        // Safari
        await (arContainerRef.current as any).webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        // Fallback: use CSS to expand to viewport
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
      // Fallback to CSS fullscreen
      setIsFullscreen(true);
    }
  };

  // Exit fullscreen
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Start render loop when AR becomes active
  useEffect(() => {
    if (!arActive) return;

    // Start the loop - renderFrame will handle canvas availability
    const frameId = requestAnimationFrame(renderFrame);

    // Store the initial frame ID (renderFrame will manage subsequent frames)
    if (!animationFrameRef.current) {
      animationFrameRef.current = frameId;
    }

    // Cleanup: stop the loop when component unmounts or AR stops
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [arActive]);

  // Render AR labels
  const renderFrame = () => {
    if (!arActive) return;

    if (!canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate AR labels
    const labels = calculateARLabels();

    // Store labels for click detection
    currentLabelsRef.current = labels;

    // Get devicePixelRatio for proper sizing on high-DPI screens
    const dpr = window.devicePixelRatio || 1;

    // MUCH BIGGER label sizes (2x+ for phone readability)
    const titleFontSize = 48; // Was 20px, now 48px (2.4x)
    const subtitleFontSize = 32; // Was 14px, now 32px (2.3x)
    const padding = 24; // Was 12px, now 24px (2x)
    const lineHeight = 56; // Was 26px, now 56px (~2.2x)
    const lineWidth = 8; // Was 4px, now 8px (2x)
    const dotRadius = 20; // Was 10px, now 20px (2x)
    const shadowBlur = 20; // Was 10px, now 20px (2x)

    // Track used positions to offset overlapping labels
    const usedPositions: Array<{ x: number; y: number; width: number; height: number }> = [];

    // Time-based animation (for helicopter hover bob)
    const timeMs = Date.now();

    // Draw labels
    labels.forEach((label) => {
      if (!label.inView) return;

      ctx.save();

      // Apply subtle hover bob for helicopters (3px vertical oscillation, 2s period)
      let bobOffset = 0;
      if (label.isHelicopter) {
        bobOffset = Math.sin(timeMs / 1000 * Math.PI) * 3;
      }

      // Title font with proper sizing
      ctx.font = `bold ${titleFontSize}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Measure text for both lines
      const titleWidth = ctx.measureText(label.title).width;
      ctx.font = `${subtitleFontSize}px monospace`;
      const subtitleWidth = ctx.measureText(label.subtitle).width;

      // Calculate box dimensions with measured text
      const boxWidth = Math.max(titleWidth, subtitleWidth) + padding * 2;
      const boxHeight = lineHeight * 2 + padding;

      // Calculate label position (start centered on label.x, label.y)
      let labelX = label.x;
      let labelY = label.y + bobOffset;  // Apply helicopter hover bob

      // Clamp inside screen bounds
      const boxLeft = labelX - boxWidth / 2;
      const boxTop = labelY - boxHeight - 30;

      if (boxLeft < 10) labelX = boxWidth / 2 + 10;
      if (boxLeft + boxWidth > canvas.width - 10) labelX = canvas.width - boxWidth / 2 - 10;
      if (boxTop < 10) labelY = boxHeight + 40;
      if (boxTop + boxHeight > canvas.height - 10) labelY = canvas.height - boxHeight + 20;

      // Check for overlap with existing labels and offset if needed
      let finalBoxLeft = labelX - boxWidth / 2;
      let finalBoxTop = labelY - boxHeight - 30;

      for (const used of usedPositions) {
        const overlapX = Math.abs(finalBoxLeft + boxWidth / 2 - used.x) < (boxWidth + used.width) / 2;
        const overlapY = Math.abs(finalBoxTop + boxHeight / 2 - used.y) < (boxHeight + used.height) / 2;

        if (overlapX && overlapY) {
          // Offset vertically to avoid overlap
          finalBoxTop = used.y + used.height + 20;
          labelY = finalBoxTop + boxHeight + 30;
          break;
        }
      }

      // Record this label's position
      usedPositions.push({
        x: finalBoxLeft + boxWidth / 2,
        y: finalBoxTop + boxHeight / 2,
        width: boxWidth,
        height: boxHeight,
      });

      // Draw outer glow for visibility
      ctx.shadowColor = label.type === 'aircraft' ? '#06b6d4' : '#a855f7';
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Background box with high opacity
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.strokeStyle = label.type === 'aircraft' ? '#06b6d4' : '#a855f7';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.roundRect(finalBoxLeft, finalBoxTop, boxWidth, boxHeight, 12);
      ctx.fill();
      ctx.stroke();

      // Reset shadow for text
      ctx.shadowBlur = 0;

      // Text - title (larger, bold)
      ctx.font = `bold ${titleFontSize}px monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label.title, finalBoxLeft + padding, finalBoxTop + padding);

      // Text - subtitle (larger)
      ctx.font = `${subtitleFontSize}px monospace`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(label.subtitle, finalBoxLeft + padding, finalBoxTop + padding + lineHeight);

      // Arrow pointer with glow
      ctx.shadowColor = label.type === 'aircraft' ? '#06b6d4' : '#a855f7';
      ctx.shadowBlur = shadowBlur;
      ctx.strokeStyle = label.type === 'aircraft' ? '#06b6d4' : '#a855f7';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(labelX, labelY - 24);
      ctx.lineTo(labelX, labelY);
      ctx.stroke();

      // Dot with glow - larger
      ctx.fillStyle = label.type === 'aircraft' ? '#06b6d4' : '#a855f7';
      ctx.beginPath();
      ctx.arc(labelX, labelY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      ctx.restore();
    });

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  };

  // Calculate AR labels with projection
  const calculateARLabels = (): ARLabel[] => {
    const labels: ARLabel[] = [];

    // Use refs to avoid stale closure issues in render loop
    const currentUserLocation = userLocationRef.current;
    const currentHeading = deviceHeadingRef.current;

    if (!currentUserLocation) {
      console.log('[LABELS] BLOCKED - No GPS location yet. Waiting for GPS lock...');
      return labels;
    }

    if (!canvasRef.current) {
      console.log('[LABELS] BLOCKED - No canvas available yet');
      return labels;
    }

    const canvas = canvasRef.current;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    console.log('[LABELS] Calculating labels for', aircraft.length, 'aircraft');
    console.log('[LABELS] User location:', { lat: currentUserLocation.latitude, lon: currentUserLocation.longitude, alt: userAltitude });
    console.log('[LABELS] Device heading:', currentHeading);

    let filtered = { noCoords: 0, tooFar: 0, outsideFOV: 0, belowHorizon: 0, passed: 0 };

    // Aircraft labels
    aircraft.forEach((ac) => {
      if (!ac.lat || !ac.lon) {
        filtered.noCoords++;
        return;
      }

      const distance = haversineDistance(currentUserLocation.latitude, currentUserLocation.longitude, ac.lat, ac.lon);
      if (distance > MAX_DISTANCE_MILES) {
        filtered.tooFar++;
        console.log('[LABELS]', ac.callsign || ac.hex, 'filtered: too far', distance.toFixed(1), 'mi');
        return;
      }

      const bearing = initialBearing(currentUserLocation.latitude, currentUserLocation.longitude, ac.lat, ac.lon);
      const elevation = elevationAngle(
        currentUserLocation.latitude,
        currentUserLocation.longitude,
        userAltitude,
        ac.lat,
        ac.lon,
        ac.altitude || 0
      );

      // Check if in FOV
      let bearingDiff = bearing - currentHeading;
      if (bearingDiff > 180) bearingDiff -= 360;
      if (bearingDiff < -180) bearingDiff += 360;

      const inHorizontalFOV = Math.abs(bearingDiff) < HORIZONTAL_FOV_DEG / 2;
      const aboveHorizon = elevation > -5; // 5 degree buffer

      if (!inHorizontalFOV) {
        filtered.outsideFOV++;
        console.log('[LABELS]', ac.callsign || ac.hex, 'filtered: outside FOV. bearing:', bearing.toFixed(1), 'heading:', currentHeading.toFixed(1), 'diff:', bearingDiff.toFixed(1));
        return;
      }

      if (!aboveHorizon) {
        filtered.belowHorizon++;
        console.log('[LABELS]', ac.callsign || ac.hex, 'filtered: below horizon. elevation:', elevation.toFixed(1));
        return;
      }

      filtered.passed++;

      // Project to screen
      const pixelsPerDegree = canvas.width / HORIZONTAL_FOV_DEG;
      const x = centerX + bearingDiff * pixelsPerDegree;
      const y = centerY - elevation * pixelsPerDegree * 0.8; // Vertical FOV scaling

      console.log('[LABELS]', ac.callsign || ac.hex, 'PASSED all filters:', {
        distance: distance.toFixed(1) + ' mi',
        bearing: bearing.toFixed(1) + '°',
        elevation: elevation.toFixed(1) + '°',
        x: x.toFixed(0),
        y: y.toFixed(0)
      });

      // Detect aircraft type for icon display
      const typeInfo = detectAircraftType(ac);
      const categoryIcon = getCategoryIcon(typeInfo.category);
      const categoryLabel = getCategoryLabel(typeInfo.category);

      labels.push({
        id: ac.hex,
        type: 'aircraft',
        title: `${categoryIcon} ${ac.callsign || ac.hex}`,
        subtitle: `${categoryLabel} · ${ac.altitude?.toLocaleString() || '---'} ft · ${distance.toFixed(1)} mi`,
        distance,
        bearing,
        elevation,
        x,
        y,
        inView: true,
        hex: ac.hex,
        registration: ac.registration,
        callsign: ac.callsign,
        altitude: ac.altitude,
        category: ac.aircraft_type,
        isHelicopter: typeInfo.category === 'helicopter',
      });
    });

    console.log('[LABELS] Filter summary:', filtered, 'Total labels:', labels.length);

    // Wardriving labels (if enabled)
    if (showWardrivingLayer && wardrivingData.length > 0) {
      wardrivingData.forEach((cell, idx) => {
        const distance = haversineDistance(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          cell.grid_lat,
          cell.grid_lon
        );
        if (distance > MAX_DISTANCE_MILES) return;

        const bearing = initialBearing(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          cell.grid_lat,
          cell.grid_lon
        );

        // Project at ground level
        const elevation = elevationAngle(
          currentUserLocation.latitude,
          currentUserLocation.longitude,
          userAltitude,
          cell.grid_lat,
          cell.grid_lon,
          OMAHA_GROUND_ELEVATION_FT
        );

        let bearingDiff = bearing - currentHeading;
        if (bearingDiff > 180) bearingDiff -= 360;
        if (bearingDiff < -180) bearingDiff += 360;

        const inHorizontalFOV = Math.abs(bearingDiff) < HORIZONTAL_FOV_DEG / 2;
        if (!inHorizontalFOV) return;

        const pixelsPerDegree = canvas.width / HORIZONTAL_FOV_DEG;
        const x = centerX + bearingDiff * pixelsPerDegree;
        const y = centerY - elevation * pixelsPerDegree * 0.8;

        // Parse channel breakdown
        const channelData = cell.channel_breakdown ? JSON.parse(cell.channel_breakdown) : {};
        const topChannel = Object.entries(channelData).sort((a: any, b: any) => b[1] - a[1])[0];

        const direction = bearing < 22.5 || bearing >= 337.5 ? 'N' :
                         bearing < 67.5 ? 'NE' :
                         bearing < 112.5 ? 'E' :
                         bearing < 157.5 ? 'SE' :
                         bearing < 202.5 ? 'S' :
                         bearing < 247.5 ? 'SW' :
                         bearing < 292.5 ? 'W' : 'NW';

        labels.push({
          id: `wifi-${idx}`,
          type: 'wifi',
          title: `WiFi ${direction} (~${distance.toFixed(1)}mi)`,
          subtitle: `${cell.network_count} nets · Ch ${topChannel ? topChannel[0] : '?'}`,
          distance,
          bearing,
          elevation,
          x,
          y,
          inView: true,
        });
      });
    }

    return labels;
  };

  // Pause when tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && arActive) {
        stopAR();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [arActive]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      stopAR();
    };
  }, []);

  // Fallback radar view when camera unavailable
  const renderFallbackView = () => {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-200 mb-2">Camera or Compass Unavailable</p>
          <p className="text-sm text-slate-400 mb-4">
            {cameraError || sensorError || 'Your device does not support AR features.'}
          </p>
          <p className="text-xs text-slate-500">Use the Live Radar view for top-down aircraft tracking.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <Camera className="w-3.5 h-3.5" />
            <span>AUGMENTED REALITY AIRSPACE PROJECTION · CAMERA + GPS + COMPASS</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Sky AR</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Live augmented reality overlay of aircraft and WiFi density. Point your device at the sky.
          </p>
        </div>
      )}

      {/* AR Canvas Container */}
      <div
        ref={arContainerRef}
        className={`relative bg-slate-950 border border-slate-800 overflow-hidden ${
          isFullscreen
            ? 'fixed inset-0 w-screen h-screen z-50 rounded-none border-0'
            : 'w-full aspect-[9/16] sm:aspect-video max-h-[70vh] rounded-xl'
        }`}
      >
        {!arActive ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            <Camera className="w-16 h-16 text-cyan-400" />
            <h3 className="text-lg font-semibold text-slate-200">Sky AR View</h3>
            <p className="text-sm text-slate-400 text-center max-w-md">
              Point your device camera at the sky to see live aircraft and WiFi density overlays.
              Requires camera, GPS, and compass access.
            </p>
            <button
              onClick={startAR}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Start AR
            </button>
            <p className="text-xs text-amber-400 mt-2">⚠️ Stay aware of your surroundings.</p>
          </div>
        ) : cameraError ? (
          renderFallbackView()
        ) : (
          <>
            {/* Camera feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover z-0"
            />

            {/* AR overlay canvas */}
            <canvas
              ref={canvasRef}
              width={1920}
              height={1080}
              onClick={handleCanvasClick}
              className="absolute inset-0 w-full h-full cursor-pointer z-10"
            />

            {/* Compass strip */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg px-4 py-2 text-xs font-mono z-20">
              <div className="flex items-center gap-2">
                <Navigation className="w-3 h-3 text-cyan-400" style={{ transform: `rotate(${deviceHeading}deg)` }} />
                <span className="text-slate-200 font-semibold">{Math.round(deviceHeading)}°</span>
                {compassAccuracy !== null && compassAccuracy > 20 && (
                  <span className="text-amber-400">±{Math.round(compassAccuracy)}°</span>
                )}
              </div>
            </div>

            {/* Sensor error warning */}
            {sensorError && (
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 max-w-xs bg-amber-950/90 border border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-200 text-center z-20">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {sensorError}
              </div>
            )}

            {/* Calibration warning */}
            {calibrationNeeded && !sensorError && (
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-amber-950/90 border border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-200 z-20">
                <Activity className="w-3 h-3 inline mr-1" />
                Move device in figure-8 pattern to calibrate compass
              </div>
            )}

            {/* GPS Warning - when no GPS lock */}
            {!userLocation && !sensorError && arActive && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-sm bg-red-950/95 border-2 border-red-500 rounded-lg p-4 text-center z-30">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-200 font-bold text-sm mb-2">GPS Location Required</p>
                <p className="text-red-300 text-xs mb-2">
                  AR labels require your location to calculate aircraft positions.
                </p>
                <p className="text-red-400 text-xs">
                  • Check browser location permission<br/>
                  • Try moving outdoors<br/>
                  • Check device location settings
                </p>
              </div>
            )}

            {/* Aircraft Photo Detail Card */}
            {selectedAircraft && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-slate-900/98 border-2 border-cyan-500 rounded-xl overflow-hidden z-40">
                <div className="relative">
                  <button
                    onClick={() => {
                      setSelectedAircraft(null);
                      setAircraftPhoto(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-950/90 hover:bg-red-600 text-white rounded-full p-2 z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {photoLoading ? (
                    <div className="w-full h-48 bg-slate-800 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                  ) : aircraftPhoto ? (
                    <div className="relative">
                      <img
                        src={aircraftPhoto.url}
                        alt={selectedAircraft.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                        <p className="text-xs text-slate-300">
                          Photo: <span className="text-cyan-400">{aircraftPhoto.photographer}</span>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-slate-800 flex flex-col items-center justify-center p-4">
                      <Camera className="w-12 h-12 text-slate-600 mb-2" />
                      <p className="text-sm text-slate-400 text-center">No photo for this airframe</p>
                      {selectedAircraft.category && (
                        <p className="text-xs text-slate-500 mt-1">{selectedAircraft.category}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedAircraft.callsign || selectedAircraft.hex}</h3>
                    {selectedAircraft.registration && (
                      <p className="text-sm text-cyan-400">{selectedAircraft.registration}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Altitude</p>
                      <p className="text-white font-mono">{selectedAircraft.altitude?.toLocaleString() || '---'} ft</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Distance</p>
                      <p className="text-white font-mono">{selectedAircraft.distance.toFixed(1)} mi</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {aircraftPhoto && (
                      <a
                        href={aircraftPhoto.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg text-center transition-colors"
                      >
                        View on Planespotters
                      </a>
                    )}
                    {(() => {
                      const fr24URL = buildFlightradar24URL({
                        callsign: selectedAircraft.callsign || selectedAircraft.hex || '',
                        registration: selectedAircraft.registration,
                        hex: selectedAircraft.hex || '',
                      });

                      return fr24URL ? (
                        <a
                          href={fr24URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg text-center transition-colors"
                        >
                          {getFlightradar24LinkText({
                            callsign: selectedAircraft.callsign || selectedAircraft.hex || '',
                            registration: selectedAircraft.registration,
                            hex: selectedAircraft.hex || '',
                          })}
                        </a>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 z-20">
              <div className="flex items-center gap-2 flex-wrap">
                {wardrivingAvailable && (
                  <button
                    onClick={() => setShowWardrivingLayer(!showWardrivingLayer)}
                    className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                      showWardrivingLayer
                        ? 'bg-purple-500 border-purple-400 text-slate-950 font-semibold'
                        : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wifi className="w-3 h-3 inline mr-1" />
                    WiFi Layer
                  </button>
                )}
                <div className="bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-400">
                  {userLocation ? (
                    <span className="text-emerald-400">GPS Locked</span>
                  ) : (
                    <span className="text-amber-400">GPS Acquiring...</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTutorial(true)}
                  className="px-3 py-3 sm:px-4 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold min-h-[44px]"
                  aria-label="Help"
                  title="Show AR Tutorial"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Help</span>
                </button>
                {isFullscreen ? (
                  <button
                    onClick={exitFullscreen}
                    className="px-3 py-3 sm:px-4 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold min-h-[44px]"
                    aria-label="Exit Fullscreen"
                  >
                    <Minimize className="w-4 h-4" />
                    <span className="hidden sm:inline">Exit Fullscreen</span>
                  </button>
                ) : (
                  <button
                    onClick={enterFullscreen}
                    className="px-3 py-3 sm:px-4 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold min-h-[44px]"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-4 h-4" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </button>
                )}
                <button
                  onClick={stopAR}
                  className="px-3 py-3 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-semibold min-h-[44px]"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop AR</span>
                </button>
              </div>
            </div>

            {/* AR Tutorial Overlay */}
            {showTutorial && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border-2 border-cyan-500 rounded-xl p-6 max-w-md w-full shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Camera className="w-6 h-6 text-cyan-400" />
                      Sky AR Quick Guide
                    </h3>
                    <button
                      onClick={dismissTutorial}
                      className="text-slate-400 hover:text-white transition-colors"
                      aria-label="Close tutorial"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-sm text-slate-300">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-white">Point your camera at the sky</p>
                        <p className="text-xs text-slate-400 mt-1">Aircraft labels appear when they're in your field of view (within 50 miles).</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-white">Wait for GPS lock</p>
                        <p className="text-xs text-slate-400 mt-1">Watch for the green "GPS Locked" indicator at the bottom. This may take 10-30 seconds outdoors.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-cyan-950/30 border border-cyan-800/50 rounded-lg p-3 -mx-1">
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-white">Tap any aircraft label to see its photo</p>
                        <p className="text-xs text-slate-400 mt-1">Opens a detail card showing altitude, distance, Planespotters photo, and Flightradar24 link. Tap X or outside to close.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        4
                      </div>
                      <div>
                        <p className="font-semibold text-white">Calibrate your compass if needed</p>
                        <p className="text-xs text-slate-400 mt-1">If labels don't align with aircraft, move your device in a figure-8 pattern to calibrate.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        ⚠️
                      </div>
                      <div>
                        <p className="font-semibold text-amber-400">Stay aware of your surroundings</p>
                        <p className="text-xs text-slate-400 mt-1">Keep an eye on where you're walking. AR mode requires full attention to both the screen and your environment.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={dismissTutorial}
                    className="w-full mt-6 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors"
                  >
                    Got it!
                  </button>

                  <p className="text-xs text-slate-500 text-center mt-3">
                    Tap the <HelpCircle className="w-3 h-3 inline" /> Help button to see this guide again
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Panel - Hidden in fullscreen */}
      {!isFullscreen && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          AR Layer Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-slate-400 mb-1">Flights Layer</div>
            <div className="text-slate-200 font-mono">
              Live aircraft within {MAX_DISTANCE_MILES} miles, above horizon
            </div>
          </div>
          <div>
            <div className="text-slate-400 mb-1">WiFi Layer (Logged Data)</div>
            <div className="text-slate-200 font-mono">
              {wardrivingAvailable
                ? `Aggregate density (~1km grid), ${wardrivingSummary?.grid_cells || 0} cells`
                : 'No data available'}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-3 text-xs text-slate-500">
          <p className="mb-1">
            <strong className="text-slate-400">Privacy:</strong> Your GPS location never leaves this browser.
          </p>
          <p>
            <strong className="text-slate-400">Altitude:</strong> Ground elevation approximated at {OMAHA_GROUND_ELEVATION_FT} ft
            {userLocation?.altitude && ` (GPS: ${Math.round(userLocation.altitude * 3.28084)} ft)`}
          </p>
        </div>
      </div>
      )}
    </div>
  );
};
