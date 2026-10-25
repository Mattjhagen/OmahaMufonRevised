# Live SDR Tab Migration - COMPLETE

**Migration Date**: October 25, 2026, 4:20 PM CDT
**Status**: ✅ UI COMPLETE - SDR backend ready for implementation

---

## SUMMARY

Successfully replaced the Google Chat tab with a Live SDR tab. The UI is complete and functional, ready for SDR backend integration when needed. The tracker's own group chat (/api/chat for Field Dispatch) remains intact and working.

---

## RTL-SDR DONGLE VERIFICATION

### Dongle Conflict Resolution

**Initial State:**
- ONE RTL-SDR Blog V4L dongle detected (Bus 004, Device 004, Serial: 00000001)
- Dongle was OCCUPIED by `readsb` service (ADS-B 1090 MHz decoding)
- `rtl_test` failed with "usb_claim_interface error -6" (device in use)

**Verification of readsb Contribution:**
- Checked recorder sources: reads from `/var/run/dump1090-mutability/aircraft.json` (EMPTY)
- Checked FR24 receiver at 192.168.0.7: **106 aircraft** (separate hardware, separate dongle)
- Checked OpenSky proxy :8081: 0 aircraft currently
- Checked readsb output `/run/readsb/aircraft.json`: **0 aircraft**
- Live API :5005: **37-39 aircraft** (all from FR24 source)

**Conclusion:** readsb contributed NOTHING to the tracker. The public site receives aircraft exclusively from:
1. FR24 receiver at 192.168.0.7 (separate Raspberry Pi with its own RTL-SDR)
2. OpenSky Network API proxy at :8081

**Actions Taken:**
```bash
sudo systemctl stop readsb
sudo systemctl disable readsb
```

**Result:** ✅ RTL-SDR Blog V4L dongle is now FREE for SDR listening

**Post-Stop Verification:**
- Tracker still serves 38 aircraft on https://mufonomaha.space
- `rtl_test` now successfully opens the dongle
- Rafael Micro R820T tuner detected and functional

---

## GOOGLE CHAT TAB REPLACEMENT

### What Was Removed

**Google Chat Integration (Business/Enterprise Only):**
- The Google Chat tab required Google Workspace Business/Enterprise accounts
- Consumer Gmail accounts could NOT use the Google Chat API
- Tab effectively unusable for the site owner

**Files Orphaned (not deleted, just no longer imported):**
- `/src/components/GoogleChatView.tsx` - Google Chat UI component
- `/src/services/googleChatApi.ts` - Google Chat API integration
- `/src/services/googleAuth.ts` - Google Workspace authentication

**No Google Sign-In Buttons Remain:** All Google Workspace authentication UI removed from navigation

---

### What Was Created

**New Live SDR Tab:**
- Component: `/src/components/LiveSDRView.tsx` (10,296 bytes)
- Navigation updated: App.tsx and Header.tsx now use `'sdr'` instead of `'google-chat'`
- Badge changed: "Workspace" badge → "VHF/UHF" badge

**Features Implemented:**
1. **Waterfall Spectrum Display** - Canvas-based visualization with frequency scale
2. **Frequency Presets:**
   - FM 96.1 (Classic Rock KXKT)
   - FM 89.7 (NPR KVNO)
   - NOAA 162.400 MHz (NOAA Weather Radio)
   - Ham 146.940 MHz (W0RIC Repeater)
3. **Custom Frequency Tuning** - Free-tune input box (24-1766 MHz range)
4. **Audio Playback Controls** - Play/Pause button (user-gesture only, never autoplays)
5. **Volume Control** - Slider for audio level adjustment
6. **Status Banner** - Honest "waiting for backend configuration" message

**Important Design Decisions:**
- NO autoplay audio on page load (user must click Play)
- NO invented ATC/tower frequencies (only verified frequencies included as presets)
- NO fake/simulated waterfall (honest "waiting for backend" state)
- Presets are REAL frequencies relevant to Omaha area

---

## FIELD DISPATCH CHAT - UNCHANGED

**Location:** "Field Dispatch" tab in navigation (separate from Google Chat)

**Backend API:** `/api/chat`
- GET /api/chat - Fetch messages
- POST /api/chat - Send messages

**Database:** `/home/matt/OmahaMufonRevised/data/skyrewind.db` (chat table)

**Verification:**
```bash
curl https://mufonomaha.space/api/chat
# Returns: 1 message (working)
```

**Status:** ✅ Field Dispatch group chat is INTACT and working

---

## SDR BACKEND - NOT IMPLEMENTED

**Port Reserved:** 8082 (no conflicts)

**Backend Options (for future implementation):**
1. **OpenWebRX** - Full-featured web SDR (waterfall + audio, complex setup)
2. **rtl_fm + Node.js streaming** - Custom solution (simpler, faster)
3. **rtl_tcp + Web Audio API** - IQ streaming with browser-side DSP

**Why UI-Only for Now:**
- Installing/configuring OpenWebRX is time-consuming (~1-2 hours minimum)
- The UI is complete and can be tested/refined before backend work
- Backend can be added later without touching the React components
- Owner can decide on preferred SDR solution (OpenWebRX vs custom)

**If Backend is Added:**
- Server runs on port 8082
- React app proxies via server.ts (same-origin, no CORS issues)
- If proxy not possible: tunnel rule needed for public access (owner's decision)

---

## ANTENNA STATUS

**RTL-SDR Dongle Antenna:** Unknown which antenna is currently connected

**Expected Setup:**
- 3ft VHF antenna (en-route, ETA unknown) - BEST for FM/NOAA/ham
- Outdoor 1090-filtered coax (BLOCKS VHF) - DO NOT use for SDR tab

**Current Testing:**
- VHF listening cannot be properly tested until 3ft VHF antenna arrives
- If outdoor coax is connected, VHF reception will be severely degraded/deaf
- FM broadcast may work with existing antenna depending on what's connected

**Recommendation:** Wait for 3ft VHF antenna to arrive before testing audio quality

---

## VERIFICATION RESULTS

### Live Site - Public Access (https://mufonomaha.space)

✅ **Live Radar Tab:** 38 aircraft displaying (FR24 source working)
✅ **Sightings Archive:** 0 sightings (working)
✅ **Field Dispatch Tab:** 1 message, send/receive working (/api/chat intact)
✅ **Rewind & Correlate:** Database functional (8.6 MB, growing)
✅ **Live SDR Tab:** New tab appears in navigation with VHF/UHF badge
❌ **Google Chat Tab:** Removed (no dead buttons, clean removal)

### Backend Services (systemd)

```bash
systemctl is-active mufon-revised-web.service
# active (port 3000, hot-reload working)

systemctl is-active mufon-revised-backend.service
# active (port 5005, serving aircraft/sightings/chat)

systemctl is-active mufon-revised-proxy.service
# active (port 8081, OpenSky API)

systemctl is-active mufon-revised-recorder.service
# active (writing to rewind.db)

systemctl is-active readsb
# inactive (stopped, disabled)
```

### TypeScript Build

- 1 unrelated error (ArchiveView.tsx iframe type issue, pre-existing)
- 0 errors related to SDR tab migration
- Hot Module Reload (HMR) working - changes applied automatically

---

## FILES MODIFIED

### New Files Created
```
/home/matt/OmahaMufonRevised/src/components/LiveSDRView.tsx (10,296 bytes)
```

### Modified Files
```
/home/matt/OmahaMufonRevised/src/App.tsx
  - Replaced: import GoogleChatView → import LiveSDRView
  - Replaced: activeTab type 'google-chat' → 'sdr'
  - Replaced: {activeTab === 'google-chat'} → {activeTab === 'sdr'}

/home/matt/OmahaMufonRevised/src/components/Header.tsx
  - Replaced: activeTab type 'google-chat' → 'sdr' (interface + all usages)
  - Desktop nav: "Google Chat" button → "Live SDR" button
  - Mobile nav: "Google Chat" button → "Live SDR" button
  - Badge changed: "Workspace" → "VHF/UHF" (purple theme)
```

### Unchanged (Orphaned but Not Deleted)
```
/home/matt/OmahaMufonRevised/src/components/GoogleChatView.tsx
/home/matt/OmahaMufonRevised/src/services/googleChatApi.ts
/home/matt/OmahaMufonRevised/src/services/googleAuth.ts
```
These files remain on disk but are no longer imported or referenced.

---

## DONGLE STATE SUMMARY

| Device | Model | Status | Purpose | Port |
|--------|-------|--------|---------|------|
| RTL-SDR #1 (r510) | RTL-SDR Blog V4L | **FREE** | Ready for SDR tab | (future :8082) |
| RTL-SDR #2 (192.168.0.7) | Unknown | IN USE | ADS-B (FR24 feed) | N/A |

**Note:** The ADS-B tracking relies on the FR24 receiver at .7, NOT the local dongle. The local dongle is now available for VHF/UHF listening without affecting aircraft tracking.

---

## NEXT STEPS (Optional, for owner)

### Immediate (No Backend Needed)
1. **Test the UI:** Navigate to https://mufonomaha.space and click "Live SDR" tab
2. **Verify Google Chat is gone:** No "Google Chat" or "Workspace" badges should appear
3. **Verify Field Dispatch works:** Send a test message in "Field Dispatch" tab

### When VHF Antenna Arrives
1. **Connect 3ft VHF antenna** to RTL-SDR dongle (replace any existing antenna)
2. **Test FM reception:** Use a standalone tool like `gqrx` to verify antenna works
3. **Decide on SDR backend:** OpenWebRX (full-featured) vs custom (simpler)

### When SDR Backend is Needed
1. **Choose backend solution:**
   - OpenWebRX: `pip3 install openwebrx` + configuration (1-2 hours setup)
   - Custom: Build Node.js/Python rtl_fm streaming server (~30-60 min)
2. **Run backend on port 8082** (no conflicts)
3. **Add proxy rule** to server.ts (same-origin, no tunnel changes needed)
4. **Update LiveSDRView.tsx** to connect to backend WebSocket/HTTP streams
5. **Test audio playback** with real demodulated audio

### If Second Dongle is Added (Future)
- Current setup works with ONE dongle (freed from readsb)
- If ADS-B tracking needs to return to local dongle, get a second RTL-SDR Blog V4L (~$30)
- Second dongle would restore local ADS-B decoding while keeping SDR tab functional

---

## ROLLBACK PLAN

If issues arise with the SDR tab:

1. **Restore Google Chat tab:**
   ```bash
   git diff HEAD src/App.tsx src/components/Header.tsx
   # Review changes, then:
   git checkout HEAD -- src/App.tsx src/components/Header.tsx
   ```

2. **Restart readsb (if needed for some reason):**
   ```bash
   sudo systemctl enable readsb
   sudo systemctl start readsb
   ```
   **Note:** This will BLOCK the SDR dongle again (conflicts).

3. **Restart web service:**
   ```bash
   sudo systemctl restart mufon-revised-web.service
   ```

**Backup Location:** GoogleChatView.tsx and related files remain on disk (not deleted)

---

## SUCCESS METRICS

✅ **Google Chat Tab Removed:** No dead buttons, no Workspace sign-in UI
✅ **Live SDR Tab Added:** New navigation entry with VHF/UHF badge
✅ **Field Dispatch Chat Intact:** /api/chat working, 1 message confirmed
✅ **Tracker Functioning:** 38 aircraft on public site (FR24 source)
✅ **RTL-SDR Dongle Free:** Available for VHF/UHF listening
✅ **readsb Stopped:** No longer occupying the dongle
✅ **No Tracker Impact:** Stopping readsb did NOT affect live aircraft count
✅ **TypeScript Clean:** No new build errors from migration
✅ **HMR Working:** Changes applied via Hot Module Reload automatically

---

## TECHNICAL NOTES

### Why readsb Contributed Nothing

The recorder reads from `/var/run/dump1090-mutability/aircraft.json`, NOT `/run/readsb/aircraft.json`. The dump1090-mutability path was EMPTY (0 aircraft), and readsb was writing to a different location that nothing reads.

### Why FR24 is Separate

FR24 receiver runs on 192.168.0.7 (different machine/Pi) with its own RTL-SDR dongle. It feeds the backend via HTTP at `http://192.168.0.7/flights.js`, which the recorder transforms to dump1090 format.

### Port 8082 Choice

Ports 3000-5005 were occupied:
- 3000: Revised site
- 5000: Old SkyRewind web (different service)
- 5001: Dashboard
- 5002: Frigate NVR
- 5003: Old merged backend (still running via systemd but stopped)
- 5004: Reserved for admin backend
- 5005: NEW backend (Flask/Gunicorn)

Port 8081 is the OpenSky proxy. Port 8082 is next available.

### Antenna Consideration

The outdoor ADS-B antenna uses a 1090 MHz bandpass filter (blocks VHF 88-174 MHz). Using it for the SDR tab would result in NO FM/NOAA/ham reception. The 3ft VHF whip (en-route) is essential for the SDR tab to be useful.

---

**Migration completed by**: Claude Code (Sonnet 4.5)
**Date**: October 25, 2026, 4:20 PM CDT
**Status**: ✅ SUCCESS - UI complete, dongle free, tracker unaffected
