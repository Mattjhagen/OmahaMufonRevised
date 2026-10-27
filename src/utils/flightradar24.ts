/**
 * Flightradar24 Link Builder
 * Generates correct FR24 URLs based on aircraft identifier type
 *
 * CRITICAL: FR24's /data/flights/ endpoint requires IATA codes (2-letter), NOT ICAO callsign prefixes (3-letter)
 * Example: DAL2206 must become DL2206, UAL2769 must become UA2769
 */

interface Aircraft {
  callsign: string;
  registration?: string | null;
  hex: string;
}

/**
 * ICAO to IATA airline code mapping
 * FR24 /data/flights/ endpoint requires IATA codes (2-letter) not ICAO callsigns (3-letter)
 *
 * Major carriers verified in our live data:
 */
const ICAO_TO_IATA: Record<string, string> = {
  // US Major Carriers
  'AAL': 'AA',  // American Airlines
  'DAL': 'DL',  // Delta Air Lines
  'UAL': 'UA',  // United Airlines
  'SWA': 'WN',  // Southwest Airlines
  'JBU': 'B6',  // JetBlue Airways
  'ASA': 'AS',  // Alaska Airlines
  'FFT': 'F9',  // Frontier Airlines
  'NKS': 'NK',  // Spirit Airlines
  'BAW': 'BA',  // British Airways
  'DLH': 'LH',  // Lufthansa
  'AFL': 'SU',  // Aeroflot
  'ACA': 'AC',  // Air Canada
  'VOI': 'VB',  // Volaris

  // Regional Carriers (branded as majors)
  'ENY': 'AA',  // Envoy Air (American Eagle)
  'PDT': 'AA',  // Piedmont Airlines (American Eagle)
  'RPA': 'AA',  // Republic Airways (American Eagle flights)
  'GJS': 'UA',  // GoJet Airlines (United Express)
  'CPZ': 'UA',  // Compass Airlines (United Express)
  'JIA': 'DL',  // PSA Airlines (Delta Connection)
  'FLG': 'DL',  // Endeavor Air (Delta Connection)

  // Cargo Carriers
  'FDX': 'FX',  // FedEx
  'UPS': '5X',  // UPS Airlines
  'ABX': 'GB',  // ABX Air
  'ATN': '8C',  // Air Transport International

  // Additional US Carriers
  'AAY': 'G4',  // Allegiant Air
  'SCX': 'SY',  // Sun Country Airlines
  'JZA': 'U2',  // easyJet

  // SKW intentionally omitted - SkyWest flies for multiple majors (UA, DL, AA, AS)
  // and we can't determine marketing carrier from callsign alone
};

/**
 * Regional carriers that fly for multiple majors - cannot determine IATA from callsign alone
 * For these, we MUST use registration-based links if available
 */
const MULTI_MAJOR_REGIONALS = new Set([
  'SKW',  // SkyWest (flies as UA, DL, AA, AS)
  'RPA',  // Republic Airways (flies as UA, AA, DL) - has AA mapping but not always accurate
]);

/**
 * Build Flightradar24 URL for an aircraft
 * Returns null if no valid link can be constructed
 *
 * Logic:
 * 1. If callsign is US registration (starts with N) -> /data/aircraft/<reg>
 * 2. If callsign is airline format (3-letter ICAO + digits):
 *    a. Convert ICAO prefix to IATA (DAL->DL, UAL->UA, ENY->AA, etc.)
 *    b. Build /data/flights/<IATA_code><flight_number>
 *    c. If no ICAO->IATA mapping exists (e.g., SKW), fall back to registration
 * 3. If registration field is available -> /data/aircraft/<registration>
 * 4. Otherwise -> return null (no valid link)
 */
export function buildFlightradar24URL(aircraft: Aircraft): string | null {
  const { callsign, registration, hex } = aircraft;

  // Case 1: Callsign is a US registration (starts with N followed by alphanumerics)
  // Examples: N240PD, N5175F, N23NG, N852CA
  if (callsign && /^N[0-9A-Z]+$/i.test(callsign)) {
    const url = `https://www.flightradar24.com/data/aircraft/${callsign.toUpperCase()}`;
    console.log(`[FR24 LINK DIAGNOSIS] GA aircraft: ${callsign} -> ${url}`);
    return url;
  }

  // Case 2: Callsign is airline format (3-letter ICAO code + digits)
  // Examples: DAL2206, UAL1904, SWA2900, ENY3558
  // Match: 3 uppercase letters followed by digits
  if (callsign && /^[A-Z]{3}\d+$/.test(callsign)) {
    const icaoPrefix = callsign.substring(0, 3);
    const flightNumber = callsign.substring(3);

    // Check if we can convert ICAO to IATA
    const iataCode = ICAO_TO_IATA[icaoPrefix];

    if (iataCode) {
      // Successfully mapped - build flight URL with IATA code
      const iataFlightNumber = `${iataCode}${flightNumber}`;
      const url = `https://www.flightradar24.com/data/flights/${iataFlightNumber}`;
      console.log(`[FR24 LINK DIAGNOSIS] Airline flight: ${callsign} (ICAO: ${icaoPrefix}) -> IATA: ${iataFlightNumber} -> ${url}`);
      return url;
    } else {
      // No ICAO->IATA mapping available
      // For multi-major regionals (like SKW), fall back to registration if available
      console.warn(`[FR24 LINK DIAGNOSIS] No IATA mapping for ICAO: ${icaoPrefix} (callsign: ${callsign})`);

      if (MULTI_MAJOR_REGIONALS.has(icaoPrefix)) {
        if (registration) {
          const url = `https://www.flightradar24.com/data/aircraft/${registration.toUpperCase()}`;
          console.log(`[FR24 LINK DIAGNOSIS] Multi-major regional ${icaoPrefix} -> using registration: ${registration} -> ${url}`);
          return url;
        } else {
          console.warn(`[FR24 LINK DIAGNOSIS] Multi-major regional ${icaoPrefix} with no registration - cannot build link`);
          return null;
        }
      }

      // Unknown carrier without registration - no link
      if (registration) {
        const url = `https://www.flightradar24.com/data/aircraft/${registration.toUpperCase()}`;
        console.log(`[FR24 LINK DIAGNOSIS] Unknown carrier ${icaoPrefix} -> fallback to registration: ${registration} -> ${url}`);
        return url;
      }

      console.warn(`[FR24 LINK DIAGNOSIS] Unknown carrier ${icaoPrefix} with no registration - cannot build link`);
      return null;
    }
  }

  // Case 3: Registration field is available (fallback)
  // This is for cases where the callsign doesn't match above patterns
  // but we have an explicit registration
  if (registration) {
    const url = `https://www.flightradar24.com/data/aircraft/${registration.toUpperCase()}`;
    console.log(`[FR24 LINK DIAGNOSIS] Fallback to registration: ${registration} -> ${url}`);
    return url;
  }

  // Case 4: No valid identifier found
  // Don't create a link - hex codes don't work on FR24
  console.warn(`[FR24 LINK DIAGNOSIS] No valid identifier for aircraft ${hex}. Callsign: ${callsign}, Reg: ${registration}`);
  return null;
}

/**
 * Get display text for FR24 link
 */
export function getFlightradar24LinkText(aircraft: Aircraft): string {
  const { callsign } = aircraft;

  // If it's a flight callsign, say "View Flight on FR24"
  if (callsign && /^[A-Z]{3}\d+$/.test(callsign)) {
    return 'View Flight on FR24';
  }

  // Otherwise "View Aircraft on FR24"
  return 'View Aircraft on FR24';
}
