/**
 * Type definitions for Omaha MUFON UAP Tracker
 */

export type SightingType =
  | 'Sphere/Orb'
  | 'Disc'
  | 'Triangle'
  | 'Cylinder'
  | 'Rectangle'
  | 'Diamond'
  | 'Formation'
  | 'Light'
  | 'Fireball'
  | 'Other';

export type DataSource = 'adsb' | 'api';

export interface Aircraft {
  hex: string;
  callsign: string;
  registration?: string;
  lat: number;
  lon: number;
  altitude?: number; // feet
  ground_speed?: number; // knots
  track?: number; // degrees 0-360
  squawk?: string;
  sources: DataSource[];
  aircraft_type?: string;
  origin?: string;
  destination?: string;
  last_seen?: string;
}

export interface AircraftObservation extends Aircraft {
  timestamp: string;
  distance_miles?: number;
}

export interface SightingReport {
  id: number;
  reporter_name: string;
  reporter_role?: string;
  sighting_time: string; // ISO 8601
  lat: number;
  lon: number;
  location_text: string;
  bearing?: number; // degrees 0-359
  elevation?: number; // degrees 0-90
  description: string;
  duration?: string;
  photo_path?: string;
  type: SightingType;
  created_at: string;
  correlation_status?: 'correlated' | 'no_match' | 'pending';
  matched_aircraft?: {
    callsign: string;
    icao_hex: string;
    distance_miles: number;
    altitude?: number;
  };
}

export interface ChatMessage {
  id: number;
  name: string;
  role?: string;
  message: string;
  timestamp: string;
  tag?: 'alert' | 'sighting' | 'weather' | 'general';
}

export interface ReceiverStationInfo {
  callsign: string;
  location: string;
  gridSquare: string;
  lat: number;
  lon: number;
  altitudeFt: number;
  receiverHardware: string;
  antenna: string;
  adsbCoverageRadiusMi: number;
  apiFallback: string;
  retentionDays: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastPing: string;
}
