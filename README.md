# Omaha MUFON Airspace Tracker

**Live Site:** [https://mufonomaha.space](https://mufonomaha.space)

A professional UAP (Unidentified Aerial Phenomena) investigation platform providing real-time ADS-B aircraft tracking, historical rewind correlation, and live SDR monitoring for the Omaha MUFON chapter and regional researchers.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production-success.svg)
![React](https://img.shields.io/badge/react-19.0-blue.svg)
![Node](https://img.shields.io/badge/node-22.x-green.svg)
![Python](https://img.shields.io/badge/python-3.12-blue.svg)

---

## Features

### 🛩️ Live Radar View
- **Real-time aircraft tracking** with ADS-B 1090 MHz data
- **Dual-source integration:** Local FR24 receiver + OpenSky Network API
- **Interactive Leaflet map** with aircraft markers and flight paths
- **Live aircraft count** and receiver status indicators
- **Flight details** including callsign, altitude, speed, heading
- **Cluster visualization** for high-traffic areas

### ⏪ Rewind & Correlate
- **Historical aircraft replay** from 90-day archive database
- **Sighting correlation engine** - Match UAP reports with aircraft positions
- **Time-travel interface** - Query any past moment within retention period
- **Geospatial filtering** - Radius-based queries around sighting locations
- **Visual comparison** - Side-by-side current vs historical aircraft
- **Elimination analysis** - Identify conventional aircraft vs unknowns

### 📡 Live SDR (NEW)
- **Real-time VHF/UHF radio monitoring** with RTL-SDR Blog V4L dongle
- **Waterfall spectrum display** - Live FFT visualization
- **Frequency presets:**
  - FM 96.1 (Classic Rock KXKT)
  - FM 89.7 (NPR KVNO)
  - NOAA Weather 162.400 MHz
  - Ham Radio 146.940 MHz (W0RIC Repeater)
- **Custom tuning** - 24-1766 MHz tunable range
- **Audio demodulation** - FM/NFM modes via rtl_fm
- **User-gesture playback** - No autoplay (browser-compliant)

### 📁 Government Archive Files (NEW)
- **Declassified UAP documents** from official sources
- **Interactive PDF viewer** with metadata
- **Geotagged reports** with map visualization
- **Search and filter** by date, location, classification level
- **Document preview** with case summaries
- **Export capabilities** for research analysis

### 🔍 Sighting Archive
- **UAP report database** with structured fields
- **Photo uploads** with secure storage
- **Witness information** and observer roles
- **Bearing and elevation** recording for triangulation
- **Duration and type classification** (lights, craft, unknown)
- **Correlation queue** - Submit reports for rewind analysis

### 📻 Field Dispatch
- **Group chat system** for investigator coordination
- **Real-time messaging** with investigator roles
- **Tag filtering** (alerts, sightings, weather, general)
- **Push notifications** to mobile devices
- **Audio chime alerts** (toggleable)
- **Timestamp tracking** for event correlation

### 📊 Station Info
- **Receiver status dashboard**
- **Coverage map** with 450 NM range visualization
- **Equipment details** (ADS-B, SDR, hardware specs)
- **Uptime statistics** and data sources
- **Location information** (Omaha, Nebraska)

---

## Technology Stack

### Frontend
- **React 19** - Component framework
- **TypeScript** - Type-safe development
- **Vite 8** - Build tooling and HMR
- **Tailwind CSS 4** - Utility-first styling
- **Leaflet** - Interactive maps
- **Lucide React** - Icon system
- **Motion (Framer Motion)** - Animations

### Backend
- **Flask** - Python web framework
- **Gunicorn** - WSGI HTTP server (4 workers)
- **SQLite** - Dual databases (rewind + sightings)
- **PyWebPush** - Push notification service
- **Node.js + Express** - SDR streaming backend
- **WebSocket (ws)** - Real-time audio/spectrum streams

### Infrastructure
- **Cloudflare Tunnel** - Zero-trust access (purepulse-r510)
- **Systemd** - Service persistence and auto-restart
- **RTL-SDR Blog V4L** - Software-defined radio hardware
- **FR24 Receiver** - ADS-B data source (192.168.0.7)
- **OpenSky Network** - API aircraft data

### Data Processing
- **rtl_fm** - Real-time FM/NFM demodulation
- **Python recorder** - 30-second interval archiving
- **OpenSky proxy** - Rate-limited API wrapper
- **SQLite triggers** - Automatic data pruning (90 days)

---

## Architecture

### Service Stack (All Systemd-Managed)

```
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Tunnel → https://mufonomaha.space               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  mufon-revised-web.service (Port 3000)                      │
│  Node.js + Vite + Express                                   │
│  - Serves React frontend                                    │
│  - Proxies API requests to backends                         │
└──────┬──────────────────┬──────────────────┬───────────────┘
       │                  │                  │
       ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Backend:5005 │  │ Proxy:8081   │  │ SDR:8082     │
│ Flask/Gunicorn│  │ OpenSky API  │  │ rtl_fm       │
│ - Aircraft   │  │ - Rate limit │  │ - Spectrum   │
│ - Sightings  │  │ - Caching    │  │ - Audio      │
│ - Chat       │  │ - Transform  │  │ - WebSocket  │
│ - Rewind     │  └──────────────┘  └──────────────┘
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Databases (SQLite)                      │
│  - rewind.db (90-day aircraft archive)   │
│  - skyrewind.db (sightings + chat)       │
└──────────────────────────────────────────┘
```

### Data Flow

**Live Aircraft:**
```
FR24 Receiver (192.168.0.7) ──┐
                               ├─→ Backend Merger ──→ /api/aircraft/live
OpenSky API (:8081) ──────────┘
```

**Historical Rewind:**
```
Recorder ──30s poll──→ rewind.db ──query──→ /api/rewind
  ↑                                              ↑
  └─ FR24 + OpenSky                              └─ Time + Location
```

**SDR Streaming:**
```
RTL-SDR Dongle ──→ rtl_fm ──→ Node.js (:8082) ──WebSocket──→ Browser
                                    ↓
                              Spectrum FFT
```

---

## Installation & Setup

### Prerequisites

- **Node.js 22.x** or later
- **Python 3.12** with pip
- **RTL-SDR drivers** (for SDR tab)
- **Systemd** (Linux service management)
- **Cloudflare Tunnel** (for public access)

### Clone Repository

```bash
git clone https://github.com/Mattjhagen/OmahaMufonRevised.git
cd OmahaMufonRevised
```

### Frontend Setup

```bash
# Install dependencies
npm install

# Development server (port 3000)
npm run dev

# Production build
npm run build
```

### Backend Setup

```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install flask gunicorn pywebpush py-vapid

# Initialize databases
python3 backend/database.py

# Start backend (development)
gunicorn -w 4 -b 0.0.0.0:5005 backend.app:app
```

### SDR Backend Setup

```bash
# Install SDR dependencies
cd sdr-backend
npm install

# Start SDR server (development)
node sdr-server.js
```

### Production Deployment (Systemd)

```bash
# Copy service files
sudo cp services/*.service /etc/systemd/system/

# Enable and start all services
sudo systemctl daemon-reload
sudo systemctl enable mufon-revised-web.service
sudo systemctl enable mufon-revised-backend.service
sudo systemctl enable mufon-revised-proxy.service
sudo systemctl enable mufon-revised-recorder.service
sudo systemctl enable mufon-revised-sdr.service

sudo systemctl start mufon-revised-web.service
sudo systemctl start mufon-revised-backend.service
sudo systemctl start mufon-revised-proxy.service
sudo systemctl start mufon-revised-recorder.service
sudo systemctl start mufon-revised-sdr.service
```

### Environment Variables

Create `.env` file:

```env
# API Keys (optional)
OPENWEATHER_API_KEY=your_key_here
CARTO_API_KEY=your_key_here

# Google Gemini (optional)
GEMINI_API_KEY=your_key_here

# Firebase (optional)
FIREBASE_API_KEY=your_key_here
FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

---

## Configuration

### Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| Web Server | 3000 | React frontend + Express proxy |
| Backend | 5005 | Flask API (aircraft, sightings, chat) |
| OpenSky Proxy | 8081 | Rate-limited OpenSky API wrapper |
| SDR Backend | 8082 | rtl_fm streaming (audio + spectrum) |
| Frigate NVR | 5002 | Security cameras (separate) |

### Database Locations

- **Aircraft Archive:** `/home/matt/OmahaMufonRevised/data/rewind.db`
- **Sightings/Chat:** `/home/matt/OmahaMufonRevised/data/skyrewind.db`
- **Photo Uploads:** `/home/matt/OmahaMufonRevised/data/uploads/`

### RTL-SDR Configuration

- **Device:** RTL-SDR Blog V4L (Rafael Micro R820T tuner)
- **Antenna:** 3ft VHF whip (for FM/NOAA/ham)
- **Frequency Range:** 24-1766 MHz
- **Modes:** Wideband FM (broadcast), Narrowband FM (NOAA, ham), AM

---

## API Endpoints

### Aircraft

- `GET /api/aircraft/live` - Current aircraft (FR24 + OpenSky merged)
- `GET /api/rewind?time=&lat=&lon=&radius=` - Historical aircraft

### Sightings

- `GET /api/sightings` - List all UAP reports
- `POST /api/sightings` - Submit new sighting report
- `GET /api/sightings/:id` - Get specific report

### Chat (Field Dispatch)

- `GET /api/chat` - Fetch messages
- `POST /api/chat` - Send message

### SDR

- `GET /api/sdr/status` - Current frequency, mode, client count
- `POST /api/sdr/tune` - Change frequency/mode
- `POST /api/sdr/start` - Start rtl_fm streaming
- `POST /api/sdr/stop` - Stop streaming
- `GET /api/sdr/health` - Backend health check

### Archive

- `GET /api/archive/metadata` - Government document metadata
- `GET /archive-files/:path` - Serve PDF files

---

## Hardware Requirements

### Minimum

- **CPU:** 2 cores @ 2.0 GHz
- **RAM:** 2 GB
- **Storage:** 10 GB (database grows ~50 MB/day)
- **Network:** 10 Mbps (for OpenSky API)

### Recommended

- **CPU:** 4+ cores @ 3.0 GHz (for SDR processing)
- **RAM:** 4 GB
- **Storage:** 50 GB SSD
- **RTL-SDR dongle** for Live SDR tab
- **GPS antenna** for ADS-B receiver (optional)

### Current Production Server

- **Dell PowerEdge R510** (home lab)
- **Intel Xeon** multi-core
- **32 GB RAM**
- **RAID storage**
- **24/7 uptime**

---

## Features in Detail

### Live Radar View

The main dashboard shows real-time aircraft within ~450 NM of Omaha, Nebraska. Aircraft data is merged from two sources:

1. **FR24 Receiver (192.168.0.7):** Local Raspberry Pi running FlightRadar24 feeder with RTL-SDR, providing ~50-100 aircraft within direct line-of-sight (up to 200 NM).

2. **OpenSky Network API:** Rate-limited public API providing global coverage, queried every 8 seconds for the Omaha region bounding box.

Aircraft markers show:
- **Callsign** (e.g., UAL1234, N12345)
- **Altitude** in feet MSL
- **Ground speed** in knots
- **Heading** in degrees
- **Last seen** timestamp

Map interactions:
- Click aircraft → view details panel
- Pan/zoom → Leaflet map controls
- Toggle map layers (optional, if CARTO API key provided)

### Rewind & Correlate

This is the **core investigation tool** for UAP research. When a sighting is reported, investigators can query historical aircraft positions to determine if conventional aircraft could explain the observation.

**Workflow:**
1. Navigate to Sightings Archive
2. Select a report
3. Click "Correlate with Rewind"
4. System queries database for aircraft within:
   - **Time:** ±30 minutes of sighting
   - **Location:** Configurable radius (default 25 NM)
5. Results show aircraft that were in the area

**Use cases:**
- **Elimination:** "Three aircraft were overhead at that exact time" → likely explanation
- **Confirmation:** "No aircraft within 50 NM" → strengthens unknown classification
- **Pattern analysis:** Multiple sightings with no aircraft → potential pattern

Database retention: **90 days** (automatically pruned older observations).

### Live SDR Tab

Real-time software-defined radio monitoring for VHF/UHF bands. Useful for:

- **NOAA Weather Radio** (162.400 MHz) - Local forecasts and alerts
- **Ham Radio** (146.940 MHz) - Amateur radio repeater monitoring
- **FM Broadcast** (88-108 MHz) - Local radio stations
- **Aviation Comms** (118-137 MHz) - Air traffic control (with proper antenna)

**Technical Implementation:**
- **rtl_fm:** Demodulates FM/NFM signals in real-time
- **WebSocket streaming:** PCM audio sent to browser
- **Canvas waterfall:** FFT spectrum visualization
- **No autoplay:** User must click Play (browser compliance)

**Antenna Requirements:**
- **3ft VHF whip** for FM/NOAA/ham (88-174 MHz)
- Outdoor 1090 MHz coax will NOT work (filtered for ADS-B only)

### Government Archive Files

Curated collection of declassified UAP documents from official sources including:

- **DoD reports** (Department of Defense)
- **AATIP findings** (Advanced Aerospace Threat Identification Program)
- **Navy pilot encounters** (USS Nimitz, USS Roosevelt incidents)
- **Historical cases** (Blue Book, Project Sign)

**Features:**
- PDF viewer with metadata sidebar
- Geotagged reports shown on map
- Search by keyword, date, location
- Classification levels clearly marked
- Source citations for authenticity

### Push Notifications

Progressive Web App (PWA) with Web Push API integration:

- **Mobile notifications** for new sightings
- **Desktop alerts** for field dispatches
- **Audio chimes** (optional, user-controlled)
- **Badge counts** for unread messages

Requires user permission (browser prompt on first use).

---

## Development

### Tech Stack Rationale

**Why React 19?**
- Latest stable release with performance improvements
- Concurrent rendering for smooth UI updates (maps, live data)
- Server components for static archive pages

**Why Flask + Gunicorn?**
- Lightweight Python backend, easy to maintain
- Gunicorn provides production-grade WSGI serving
- Simple SQLite databases (no PostgreSQL complexity for this scale)

**Why SQLite?**
- Zero configuration, embedded database
- Sufficient for single-server deployment
- Automatic journaling and ACID compliance
- Easy backups (copy .db files)

**Why Systemd?**
- Native Linux service management
- Automatic restart on failure
- Log aggregation via journalctl
- Dependency ordering (backend → web server)

**Why Custom rtl_fm Backend (Not OpenWebRX)?**
- OpenWebRX requires 1-2 hours of compilation
- Custom solution completed in 30 minutes
- Full control over demodulation parameters
- Easier to maintain and debug

### Code Structure

```
OmahaMufonRevised/
├── src/                          # React frontend
│   ├── components/              # React components
│   │   ├── LiveRadarView.tsx   # Main aircraft map
│   │   ├── RewindCorrelateView.tsx
│   │   ├── LiveSDRView.tsx     # SDR tab (NEW)
│   │   ├── ArchiveView.tsx     # Gov files (NEW)
│   │   ├── SightingsArchiveView.tsx
│   │   ├── FieldDispatchView.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   ├── services/               # API clients
│   ├── types/                  # TypeScript interfaces
│   └── data/                   # Static data
├── backend/                     # Python Flask API
│   ├── app.py                  # Main Flask app
│   ├── database.py             # SQLite operations
│   └── vapid_private.pem       # Push notification keys
├── services/                    # Background services
│   ├── recorder.py             # Aircraft archiver
│   └── aircraft-proxy.py       # OpenSky wrapper
├── sdr-backend/                # SDR streaming (NEW)
│   ├── sdr-server.js           # Node.js backend
│   └── package.json
├── data/                       # Databases + uploads
│   ├── rewind.db               # Aircraft archive
│   ├── skyrewind.db            # Sightings + chat
│   └── uploads/                # Photo storage
├── UAP_Files/                  # Government docs (NEW)
│   └── archive-extracted/
├── server.ts                   # Main Express server
├── vite.config.ts              # Build configuration
├── package.json                # Node dependencies
└── README.md                   # This file
```

### Running Tests

```bash
# Frontend type checking
npm run lint

# Backend smoke test
curl http://localhost:5005/api/aircraft/live

# SDR backend test
curl http://localhost:8082/health
```

---

## Troubleshooting

### "No aircraft showing on map"

**Check:**
1. Backend service: `systemctl status mufon-revised-backend.service`
2. FR24 receiver: `curl http://192.168.0.7/flights.js`
3. OpenSky proxy: `curl http://localhost:8081/data/aircraft.json`
4. Browser console for API errors

**Fix:**
```bash
sudo systemctl restart mufon-revised-backend.service
```

### "Live SDR shows Offline"

**Check:**
1. SDR service: `systemctl status mufon-revised-sdr.service`
2. Port 8082: `ss -tlnp | grep 8082`
3. RTL-SDR dongle: `rtl_test -t`

**Fix:**
```bash
# If another process is using the dongle
ps aux | grep rtl_
sudo systemctl restart mufon-revised-sdr.service
```

### "Rewind query returns no results"

**Check:**
1. Recorder service: `systemctl status mufon-revised-recorder.service`
2. Database size: `ls -lh data/rewind.db`
3. Observation count: `sqlite3 data/rewind.db "SELECT COUNT(*) FROM aircraft_observations;"`

**Fix:**
```bash
# Restart recorder if stopped
sudo systemctl restart mufon-revised-recorder.service
```

### "Push notifications not working"

**Check:**
1. Browser permissions (site settings)
2. VAPID keys exist: `ls -la backend/vapid_private.pem`
3. HTTPS required (notifications won't work on HTTP)

**Fix:**
- Regenerate VAPID keys if missing:
```bash
cd backend
python3 -c "from py_vapid import Vapid; Vapid().save('vapid_private.pem')"
```

---

## Contributing

This project is maintained by Omaha MUFON for investigative research. Contributions welcome:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Open Pull Request

### Code Style

- **Frontend:** Prettier + ESLint (React/TypeScript standards)
- **Backend:** Black formatter (Python)
- **Commits:** Conventional Commits format

---

## License

This project is provided as-is for UAP research and investigation purposes. Not licensed for commercial use without permission.

**Data Sources:**
- ADS-B data: Public aviation broadcasts (1090 MHz)
- OpenSky Network: CC BY-NC-SA 4.0
- Government documents: Public domain (declassified)

**Third-Party:**
- Leaflet: BSD-2-Clause
- React: MIT
- Flask: BSD-3-Clause

---

## Acknowledgments

- **Omaha MUFON Chapter** - Investigation coordination
- **OpenSky Network** - Free aircraft data API
- **FlightRadar24** - ADS-B receiver software
- **RTL-SDR community** - Hardware and software tools
- **Cloudflare** - Zero-trust tunnel service

---

## Contact

- **Live Site:** [https://mufonomaha.space](https://mufonomaha.space)
- **GitHub:** [Mattjhagen/OmahaMufonRevised](https://github.com/Mattjhagen/OmahaMufonRevised)
- **Email:** mattjhagen0@gmail.com

---

## Changelog

### Version 2.0.0 (October 2026)

**Major Features Added:**
- ✨ **Live SDR Tab** - Real-time VHF/UHF radio monitoring with rtl_fm
- 📁 **Government Archive Files** - Declassified UAP document viewer
- 🔄 **Backend Migration** - Moved from :5003 to :5005, systemd persistence
- 🎨 **UI Refresh** - Updated navigation, status badges, improved mobile layout

**Technical Improvements:**
- Systemd services for entire stack (web, backend, proxy, recorder, SDR)
- WebSocket audio/spectrum streaming for SDR
- Same-origin API proxying (no CORS issues)
- 90-day aircraft archive with automatic pruning
- Dual-source aircraft merging (FR24 + OpenSky)

**Bug Fixes:**
- Fixed rewind query parameter handling
- Resolved RTL-SDR dongle conflicts (stopped readsb)
- Improved error handling for offline data sources

### Version 1.0.0 (June 2024)

- Initial release with Live Radar and Rewind features
- ADS-B tracking and historical correlation
- Sighting reports and field dispatch chat
- PWA with push notifications

---

**Built with 🛸 for UAP research and aerospace investigation.**
