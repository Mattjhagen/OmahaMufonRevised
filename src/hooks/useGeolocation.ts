import { useState, useCallback, useEffect } from 'react';

export interface GeoLocationState {
  lat: number | null;
  lon: number | null;
  accuracy: number | null; // meters
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  locationName: string | null;
  loading: boolean;
  error: string | null;
  timestamp: number | null;
}

export function useGeolocation() {
  const [geoState, setGeoState] = useState<GeoLocationState>({
    lat: null,
    lon: null,
    accuracy: null,
    altitude: null,
    heading: null,
    speed: null,
    locationName: null,
    loading: false,
    error: null,
    timestamp: null,
  });

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const res = await fetch(`/api/osm/reverse?lat=${lat}&lon=${lon}`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address;
        if (addr) {
          const parts = [
            addr.road || addr.suburb || addr.neighbourhood,
            addr.city || addr.town || addr.county || 'Omaha Metro',
            addr.state || 'NE',
          ].filter(Boolean);
          return parts.join(', ');
        }
        return data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    } catch {
      // Fallback to formatted coordinates
    }
    return `${lat.toFixed(4)}°N, ${Math.abs(lon).toFixed(4)}°W`;
  };

  const requestLocation = useCallback(async (): Promise<{ lat: number; lon: number; locationName: string } | null> => {
    if (!navigator.geolocation) {
      setGeoState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported on this device/browser',
      }));
      return null;
    }

    setGeoState((prev) => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
          const locName = await reverseGeocode(latitude, longitude);

          const newState: GeoLocationState = {
            lat: latitude,
            lon: longitude,
            accuracy: accuracy ? Math.round(accuracy) : null,
            altitude: altitude ? Math.round(altitude) : null,
            heading,
            speed,
            locationName: locName,
            loading: false,
            error: null,
            timestamp: position.timestamp,
          };

          setGeoState(newState);
          resolve({ lat: latitude, lon: longitude, locationName: locName });
        },
        (error) => {
          let errorMsg = 'Failed to retrieve GPS location.';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied by user.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMsg = 'GPS satellite position unavailable.';
          } else if (error.code === error.TIMEOUT) {
            errorMsg = 'GPS location request timed out.';
          }

          setGeoState((prev) => ({
            ...prev,
            loading: false,
            error: errorMsg,
          }));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, []);

  return {
    ...geoState,
    requestLocation,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  };
}
