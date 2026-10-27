/**
 * Aircraft Type Detection Utility
 * Determines if an aircraft is a helicopter, fixed-wing, or unknown based on available data
 */

import { Aircraft } from '../types';

export type AircraftCategory = 'helicopter' | 'fixed-wing' | 'unknown';

interface AircraftTypeInfo {
  category: AircraftCategory;
  confidence: 'high' | 'medium' | 'low';
}

// Known helicopter callsign patterns
const HELICOPTER_PATTERNS = [
  /^N\d{1,4}[A-Z]{0,2}$/,  // General aviation helicopters (e.g., N240PD, N500PD)
  /LIFE|MEDIC|CARE|AIR\d+/i,  // Medical helicopters
  /^PD\d|POLICE|CHP|SHERIFF/i,  // Police helicopters
  /NEWS|CHOPPER|SKY\d/i,  // News helicopters
  /^EC\d{3}|^AS\d{3}|^BK\d{3}/,  // Eurocopter/Airbus model codes
];

// Known helicopter operators/registrations
const KNOWN_HELICOPTERS: Set<string> = new Set([
  'N240PD',  // Omaha Police Department Bell 505
  'N500PD',  // Common police helicopter registration pattern
]);

/**
 * Detect aircraft type based on available information
 */
export function detectAircraftType(aircraft: Aircraft): AircraftTypeInfo {
  const { callsign, hex, altitude = 0, ground_speed = 0, aircraft_type } = aircraft;

  // Check explicit aircraft_type field first (if backend provides it)
  if (aircraft_type) {
    const typeLower = aircraft_type.toLowerCase();
    if (typeLower.includes('helicopter') || typeLower.includes('heli') ||
        typeLower.includes('bell') || typeLower.includes('eurocopter') ||
        typeLower.includes('robinson') || typeLower.includes('sikorsky')) {
      return { category: 'helicopter', confidence: 'high' };
    }
  }

  // Check known helicopter registrations (highest confidence)
  const identifier = callsign || hex;
  if (KNOWN_HELICOPTERS.has(identifier.toUpperCase())) {
    return { category: 'helicopter', confidence: 'high' };
  }

  // Check callsign patterns
  for (const pattern of HELICOPTER_PATTERNS) {
    if (pattern.test(identifier)) {
      return { category: 'helicopter', confidence: 'high' };
    }
  }

  // Heuristic: altitude + speed analysis
  // Helicopters typically fly below 5,000 ft and slower than 150 kts
  // BUT: this is a weak signal - many small planes also fly low and slow
  if (altitude > 0 && ground_speed > 0) {
    // Very likely helicopter: low + slow
    if (altitude < 3000 && ground_speed < 120) {
      return { category: 'helicopter', confidence: 'medium' };
    }

    // Very likely fixed-wing: high + fast
    if (altitude > 10000 || ground_speed > 250) {
      return { category: 'fixed-wing', confidence: 'medium' };
    }

    // Ambiguous zone (3000-10000 ft, 120-250 kts)
    // Could be either - default to unknown
    return { category: 'unknown', confidence: 'low' };
  }

  // No telemetry data available - can't determine
  return { category: 'unknown', confidence: 'low' };
}

/**
 * Get a human-readable label for aircraft category
 */
export function getCategoryLabel(category: AircraftCategory): string {
  switch (category) {
    case 'helicopter':
      return 'Helicopter';
    case 'fixed-wing':
      return 'Aircraft';
    case 'unknown':
      return 'Aircraft';
  }
}

/**
 * Get emoji icon for aircraft category
 */
export function getCategoryIcon(category: AircraftCategory): string {
  switch (category) {
    case 'helicopter':
      return '🚁';
    case 'fixed-wing':
      return '✈️';
    case 'unknown':
      return '⬤';
  }
}
