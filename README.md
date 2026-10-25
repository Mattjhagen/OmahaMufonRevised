# Omaha MUFON UAP Tracker

Real-time aircraft tracking system for UAP sighting correlation in the Omaha, NE area. Combines live ADS-B data from a Flightradar24 receiver with OpenSky Network API coverage, archives 90 days of observations, and provides time-rewind capability for correlating user-reported UAP sightings with known aircraft.

## Architecture

### Components

**Web Application (Port 5003)**
- Flask backend serving tracking interface
- Real-time aircraft map with source badges [ADS-B] and [API]
- UAP sighting report submission
- Historical "rewind" view for sighting correlation
- Public URL: uap.mattjhagen.xyz

**OpenSky API Proxy (Port 8080)**
- Fetches aircraft data from OpenSky Network
- Covers Omaha area (lat 40.5-42.0, lon -97.0 to -95.0)
- Provides API layer for non-ADS-B coverage

**Recorder Service**
- Polls every 30 seconds
- Archives observations to SQLite database (`data/rewind.db`)
- Maintains 90-day rolling window
- Prunes old data automatically

**Data Sources**
- **Primary ADS-B**: Flightradar24 receiver at 192.168.0.7/flights.js (Omaha coverage)
- **Secondary API**: OpenSky Network (fills gaps, rate-limited)
- **Note**: Local dump1090-mutability (r510) is installed but non-functional due to RTL-SDR hardware issues

### Database Schema

**`data/rewind.db`** (Aircraft observations, NOT committed)
- `observations` table: timestamp, source (adsb/api), icao_hex, callsign, lat, lon, altitude, speed, track, squawk
- Indexed by timestamp, icao_hex, source
- 90-day retention

**`data/skyrewind.db`** (User reports, NOT committed)
- `sightings` table: reporter_name, sighting_time, lat, lon, location_text, bearing, elevation, description, duration, photo_path, type, created_at
- `chat` table: name, message, timestamp, ip

Database files are never committed (see `.gitignore`). Schema descriptions only.

## Installation

### Prerequisites
- Python 3.12+
- SQLite3
- Systemd (for services)
- Access to FR24 receiver at 192.168.0.7

### Setup

1. **Install Python dependencies:**
   ```bash
   cd /opt/skyrewind-merged
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Initialize databases:**
   ```bash
   # Databases initialize automatically on first run
   python3 -c "from backend.database import init_db, init_rewind_db; init_db(); init_rewind_db()"
   ```

3. **Install systemd services:**
   ```bash
   sudo cp systemd/*.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable skyrewind-merged-web skyrewind-merged-recorder skyrewind-merged-aircraft-proxy
   sudo systemctl start skyrewind-merged-web skyrewind-merged-recorder skyrewind-merged-aircraft-proxy
   ```

4. **Verify services:**
   ```bash
   systemctl status skyrewind-merged-web
   systemctl status skyrewind-merged-recorder
   systemctl status skyrewind-merged-aircraft-proxy
   ```

## Usage

### Web Interface
Visit http://localhost:5003 or https://uap.mattjhagen.xyz

**Features:**
- Live aircraft tracking with real-time updates
- Source badges distinguish ADS-B from API data
- Submit UAP sighting reports with location and time
- Rewind to any past time (90-day window)
- Aircraft correlation for sighting verification

### API Endpoints

**Aircraft Data:**
- `GET /api/aircraft/live` - Current aircraft (FR24 + OpenSky)
- `GET /api/rewind?time=<iso>&lat=<lat>&lon=<lon>&radius=<miles>` - Historical aircraft

**Sighting Reports:**
- `GET /api/sightings` - All UAP reports
- `POST /api/sightings` - Submit new report
- `GET /api/sightings/<id>` - Specific report
- `GET /api/sighting-types` - Report counts by type

**Chat:**
- `GET /api/chat` - Recent messages
- `POST /api/chat` - Send message

### Report Types
- Sphere/Orb
- Disc
- Triangle
- Cylinder
- Rectangle
- Diamond
- Formation
- Light
- Fireball
- Other

## Wording Rules

**CRITICAL**: When aircraft correlation finds no ADS-B or API match for a sighting, the system reports:

> "No ADS-B match found"

**NEVER** use terms like "UFO", "unidentified", or "anomalous" for an unmatched track. The absence of a match means only that no cooperative aircraft was broadcasting ADS-B in that area at that time. Non-cooperative aircraft, military traffic, and coverage gaps are routine.

## Data Retention

- **Aircraft observations**: 90 days
- **User sightings**: Indefinite (no auto-deletion)
- **Chat messages**: Indefinite (future: may add retention policy)

Observations older than 90 days are automatically pruned by the recorder service.

## Deployment

Currently deployed at:
- **Public URL**: https://uap.mattjhagen.xyz
- **Internal**: http://r510:5003
- **Cloudflare Tunnel**: mattys-sdr-blog (managed in /root/.cloudflared/config.yml)

See `SETUP_INSTRUCTIONS.txt` for detailed deployment notes.

## Project Status

This is the **pre-restyle snapshot** committed before the command-center UI restyle. The current state:

✅ **Functional:**
- Backend with FR24-backed ADS-B layer
- OpenSky API integration
- 90-day recorder archive
- Rewind/correlation API
- User sighting reports
- Chat system (backend complete)
- Type categorization (backend complete)

⚠️ **Pending:**
- Command-center UI restyle (see `RESTYLE-STATUS.md`)
- Photo upload UI
- Chat UI
- Types filtering UI
- Detail panel with PREV/NEXT

See `RESTYLE-STATUS.md` for full restyle implementation status.

## Development

**Running locally:**
```bash
# Start web service
cd /opt/skyrewind-merged
source venv/bin/activate
python3 backend/app.py

# Start recorder (separate terminal)
python3 services/recorder.py

# Start OpenSky proxy (separate terminal)
python3 services/aircraft-proxy.py
```

**Testing:**
```bash
# Test live aircraft API
curl http://localhost:5003/api/aircraft/live

# Test rewind
curl "http://localhost:5003/api/rewind?time=$(date -u +%Y-%m-%dT%H:%M:%SZ)&lat=41.25&lon=-95.95&radius=50"

# Test chat
curl -X POST http://localhost:5003/api/chat \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","message":"Hello"}'
```

## Future Enhancements

- Google OAuth for user identity
- User-adopted titles in chat (Field Investigator, Researcher, Analyst, etc.)
- Moderation tools for reports and chat
- Enhanced photo management
- Export/analysis tools
- Integration with MUFON reporting

## License

MIT

## Credits

Developed for Omaha MUFON chapter. Aircraft data provided by Flightradar24 (ADS-B) and OpenSky Network (API).
