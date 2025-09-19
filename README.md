# Radio Calico 📻

A modern web-based radio streaming application with real-time track information and interactive rating features.

## Radio Features

### 🎵 Live Audio Streaming
- **High-quality audio**: 48kHz FLAC streaming via HLS (HTTP Live Streaming)
- **Stream URL**: `https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`
- **Browser compatibility**: Uses HLS.js for cross-browser support
- **Audio controls**: Play/pause, volume control with visual slider

### 🎨 Dynamic Track Display
- **Real-time track information**: Artist name, song title, and album details
- **Album artwork**: Dynamic cover art loading from CDN
- **Loading states**: Elegant shimmer effects while fetching track data
- **Previous tracks**: History of recently played songs

### ⭐ Interactive Rating System
- **Thumbs up/down**: Rate tracks in real-time
- **Persistent ratings**: SQLite database stores all user ratings
- **User fingerprinting**: Anonymous rating system using client IP
- **Rating aggregation**: View community ratings for each track

### 🎛️ Player Controls
- **Responsive design**: Works on desktop and mobile devices
- **Live stream indicator**: Shows streaming status and time
- **Volume control**: Adjustable audio levels with visual feedback
- **Status updates**: Real-time connection and playback status

## Technical Implementation

### Frontend (`radio.html`)
- Modern HTML5 audio player with HLS.js integration
- Responsive CSS design with loading animations
- Real-time JavaScript for track updates and user interactions
- Google Fonts integration (Montserrat, Open Sans)

### Backend API Endpoints
- `GET /radio` - Serves the radio player interface
- `GET /api/song/:songHash/ratings` - Fetch track ratings
- `POST /api/song/:songHash/rate` - Submit track rating
- `GET /api/song/:songHash/user-rating/:userId` - Get user's rating for track
- `GET /api/client-ip` - Client fingerprinting for anonymous ratings

### Database Schema
```sql
-- Song metadata
CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  song_hash TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User ratings (-1 for thumbs down, 1 for thumbs up)
CREATE TABLE ratings (
  id INTEGER PRIMARY KEY,
  song_id INTEGER,
  user_id TEXT,
  rating INTEGER CHECK (rating IN (-1, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(song_id, user_id)
);
```

## Getting Started

### Option 1: Docker (Recommended)

#### Development Environment
```bash
# Build and start development container
docker-compose up

# Or run in background
docker-compose up -d
```

#### Production Deployment
```bash
# Deploy production container
docker-compose -f docker-compose.prod.yml up -d
```

#### Manual Docker Build
```bash
# Development image
docker build --target development -t radiocalico:dev .

# Production image
docker build --target production -t radiocalico:prod .
```

### Option 2: Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

### Access the Application
- Open `http://localhost:3001/radio` in your browser
- The audio stream will begin loading automatically

## Stream Quality

- **Format**: HLS (HTTP Live Streaming)
- **Audio Quality**: 48kHz FLAC lossless
- **Delivery**: Amazon CloudFront CDN for global performance
- **Compatibility**: All modern browsers via HLS.js polyfill

## Docker Deployment

### Container Features
- **Multi-stage build**: Separate development and production images
- **Security hardening**: Non-root user, read-only filesystem (production)
- **Persistent storage**: SQLite database persisted via Docker volumes
- **Health checks**: Built-in container health monitoring
- **Optimized images**: Development (552MB), Production (425MB)

### Development Container
- Includes all dev dependencies and testing frameworks
- Live code mounting for hot reload during development
- Full test suite available (`npm test`)

### Production Container
- Minimal production-only dependencies
- Security features: capability restrictions, logging limits
- Optimized for deployment with proper signal handling

## Architecture

The radio system uses a client-server architecture:
- **Client**: HTML5 audio player with JavaScript controls
- **Server**: Express.js API with SQLite database
- **Stream**: External HLS stream served via CDN
- **Security**: Helmet.js with CSP policies for secure streaming
- **Deployment**: Dockerized with multi-stage builds for dev/prod environments