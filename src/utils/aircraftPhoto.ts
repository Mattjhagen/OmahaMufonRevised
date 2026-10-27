/**
 * Aircraft Photo Fetching Utility
 * Shared Planespotters API integration for Sky AR, Live Radar, and Rewind views
 */

export interface AircraftPhoto {
  url: string;
  photographer: string;
  link: string;
}

export interface AircraftPhotoIdentifiers {
  hex: string;
  registration?: string | null;
  callsign?: string;
}

/**
 * Fetch aircraft photo from Planespotters API via same-origin proxy
 *
 * Lookup priority:
 * 1. Hex code (works for all ADS-B aircraft)
 * 2. Registration fallback (if available)
 *
 * Returns null if no photo found after trying both methods.
 * Logs all attempts for diagnosis.
 */
export async function fetchAircraftPhoto(
  identifiers: AircraftPhotoIdentifiers
): Promise<AircraftPhoto | null> {
  const { hex, registration, callsign } = identifiers;

  if (!hex) {
    console.warn('[PHOTO] No hex available for aircraft, cannot fetch photo');
    return null;
  }

  // Log aircraft identifiers
  console.log(`[PHOTO FETCH] Aircraft: ${callsign || hex}`);
  console.log(`  Identifiers: callsign="${callsign}", reg="${registration}", hex="${hex}"`);

  try {
    // Try hex first (primary method)
    console.log(`[PHOTO FETCH] Attempting hex lookup: ${hex}`);
    let response = await fetch(`/api/planespotters/hex/${hex}`);
    let data = await response.json();
    console.log(`[PHOTO FETCH] Hex query result: ${data.photos?.length || 0} photos found`);

    // If no photos from hex, try registration fallback
    if ((!data.photos || data.photos.length === 0) && registration) {
      console.log(`[PHOTO FETCH] Hex returned no photos, attempting registration lookup: ${registration}`);
      response = await fetch(`/api/planespotters/reg/${registration}`);
      data = await response.json();
      console.log(`[PHOTO FETCH] Registration query result: ${data.photos?.length || 0} photos found`);
    } else if (!data.photos || data.photos.length === 0) {
      console.warn(`[PHOTO FETCH] No photos found for hex ${hex}, and no registration available to try as fallback`);
    }

    // Return first photo if available
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      console.log(`[PHOTO FETCH] SUCCESS - Photo loaded from ${photo.photographer}`);
      return {
        url: photo.thumbnail_large.src,
        photographer: photo.photographer,
        link: photo.link,
      };
    }

    console.warn(`[PHOTO FETCH] FAILED - No photos available after trying both hex and registration`);
    return null;
  } catch (err) {
    console.error('[PHOTO FETCH] ERROR:', err);
    return null;
  }
}

/**
 * Special case: If callsign itself is an N-registration (e.g., N828SK),
 * try registration lookup in addition to hex
 */
export async function fetchAircraftPhotoWithCallsignFallback(
  identifiers: AircraftPhotoIdentifiers
): Promise<AircraftPhoto | null> {
  const { callsign } = identifiers;

  // First try standard hex/registration lookup
  const photo = await fetchAircraftPhoto(identifiers);
  if (photo) return photo;

  // If callsign looks like an N-registration and we didn't already have it as registration
  if (callsign && /^N[0-9A-Z]+$/i.test(callsign) && callsign !== identifiers.registration) {
    console.log(`[PHOTO FETCH] Callsign ${callsign} looks like N-registration, trying as registration query`);
    try {
      const response = await fetch(`/api/planespotters/reg/${callsign.toUpperCase()}`);
      const data = await response.json();
      console.log(`[PHOTO FETCH] Callsign-as-registration query result: ${data.photos?.length || 0} photos found`);

      if (data.photos && data.photos.length > 0) {
        const photoData = data.photos[0];
        console.log(`[PHOTO FETCH] SUCCESS - Photo loaded from ${photoData.photographer} (via callsign registration)`);
        return {
          url: photoData.thumbnail_large.src,
          photographer: photoData.photographer,
          link: photoData.link,
        };
      }
    } catch (err) {
      console.error('[PHOTO FETCH] Callsign-as-registration query error:', err);
    }
  }

  return null;
}
