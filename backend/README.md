# DORA Backend - Music Recommendation Engine

## What is DORA?

DORA uses your music taste combined with real-time weather to generate personalized album recommendations. Instead of generic playlists, you get music that matches both **who you are** (your taste profile) and **how you feel right now** (weather mood). Love dancing in sunny weather but prefer introspection when it rains? DORA gets it.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Spotify Developer Account ([create app here](https://developer.spotify.com/dashboard))
- OpenWeatherMap API key ([get free tier here](https://openweathermap.org/api))

### Setup (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** in the backend folder:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/dora
   JWT_SECRET=your-super-secret-key-min-32-chars
   JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
   SPOTIFY_CLIENT_ID=from-spotify-dashboard
   SPOTIFY_CLIENT_SECRET=from-spotify-dashboard
   SPOTIFY_REDIRECT_URI=http://localhost:5173/callback
   OPENWEATHER_API_KEY=from-openweathermap
   PORT=3000
   ```

3. **Setup database:**
   ```bash
   npx prisma migrate dev
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

Server runs on `http://localhost:3000`

## Folder Structure

```
backend/
├── src/
│   ├── index.ts                          # Express app entry point
│   │
│   ├── middleware/                       # HTTP request middleware
│   │   └── authMiddleware.ts             # JWT token validation
│   │
│   ├── routes/                           # HTTP endpoint definitions
│   │   ├── auth.routes.ts                # Spotify OAuth endpoints
│   │   ├── recommendation.routes.ts      # GET /api/recommendations
│   │   ├── users.routes.ts               # User profile endpoints
│   │   ├── albums.routes.ts              # Favorites & surveys
│   │   └── weather.routes.ts             # Weather mood endpoints
│   ├── controllers/                      # HTTP request handlers
│   │   ├── auth.controller.ts            # OAuth orchestration
│   │   ├── recommendation.controller.ts  # Recommendations entry point
│   │   ├── users.controller.ts           # User profile logic
│   │   ├── albums.controller.ts          # Favorites logic
│   │   ├── survey.controller.ts          # Survey handling
│   │   └── weather.controller.ts         # Weather API coordination
│   ├── services/                         # Business logic (algorithms, DB operations)
│   │   ├── recommendation.service.ts     # CORE: 12-stage recommendation pipeline
│   │   ├── audio-analysis.service.ts     # Convert Spotify features to emotions
│   │   ├── auth.service.ts               # OAuth 2.0 flow & JWT tokens
│   │   ├── users.service.ts              # User profile database operations
│   │   ├── survey.service.ts             # Survey responses & taste profile generation
│   │   ├── albums.service.ts             # Favorites management
│   │   └── weather.service.ts            # Weather condition → mood mapping
│   ├── utils/                            # Helper utilities
│   │   ├── spotify-client.ts             # Spotify API factory
│   │   ├── weather-client.ts             # OpenWeatherMap API factory
│   │   └── weatherToMood.ts              # Weather → emotional dimensions
│   ├── types/                            # TypeScript interfaces
│   │   ├── recommendation.dto.ts         # Recommendation response shape
│   │   ├── survey.dto.ts                 # Survey data structures
│   │   ├── audio-analysis.dto.ts         # Audio feature mappings
│   │   ├── spotify.dto.ts                # Spotify API types
│   │   └── weather.dto.ts                # Weather API types
│   └── prisma/
│       ├── schema.prisma                 # Database schema (User, Album, Survey, etc.)
│       └── migrations/                   # Database version history
├── docs/                                 # Generated TypeDoc HTML documentation
├── package.json                          # Dependencies & scripts
└── tsconfig.json                         # TypeScript configuration
```

## How It Works

### 1. Authentication (Spotify OAuth)
```
User clicks "Login" → 
Redirect to Spotify → 
User grants permission → 
Get Spotify tokens → 
Create JWT for frontend
```

### 2. User Taste Profile
```
User takes 5+ album surveys →
Each survey is emotional feedback (like/love/meh/hate) →
Analyzes audio features (danceability, valence, energy, etc.) →
Creates 9D emotional taste profile (nature, movement, healing, etc.)
```

### 3. Recommendation Algorithm
```
Get user location (coordinates) →
Fetch real-time weather →
Map weather to emotional context (rainy = introspection boost) →
Blend user taste (60%) + weather mood (40%) →
Find similar albums on Spotify →
Filter out already-saved albums →
Rank by emotional similarity →
Return top 3 recommendations
```

## Documentation

Navigate the sidebar to explore:

- **Controllers** - HTTP request handlers that parse input and format responses
- **Services** - Business logic including the 12-stage recommendation engine
- **Routes** - API endpoint definitions  
- **Utils** - Helper functions for Spotify API, weather API, emotional mapping
- **Types** - TypeScript interfaces for all data structures

**Key files to understand first:**
1. [services/recommendation.service.ts](./modules/services_recommendation.html) - The core algorithm
2. [services/survey.service.ts](./modules/services_survey.html) - How taste profiles are built
3. [services/audio-analysis.service.ts](./modules/services_audio-analysis.html) - Audio → emotion mapping

## Common Commands

```bash
# Development server with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm build

# Generate/update database migrations
npx prisma migrate dev

# View database in visual editor
npm run prisma:studio

# Regenerate HTML documentation
npm run docs

# Serve documentation locally
npm run docs:serve
```

## Troubleshooting

**Server won't start?**
- Check `.env` file exists and DATABASE_URL is correct
- Ensure PostgreSQL is running: `psql -U postgres`
- Run migrations: `npx prisma migrate dev`

**Spotify auth failing?**
- Verify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env
- Check SPOTIFY_REDIRECT_URI matches Spotify dashboard settings
- Clear browser localStorage and try again

**Database errors?**
- Validate schema: `npx prisma validate`
- Reset database: `npx prisma migrate reset` (WARNING: deletes all data)
- Check database connection: `psql $DATABASE_URL`

## Next Steps

1. **Read the code**: Start with services/recommendation.service.ts to understand the algorithm
2. **Explore endpoints**: Check routes/ folder to see what APIs are available
3. **Try a recommendation**: Authenticate, take surveys, then call GET /api/recommendations
4. **Extend it**: Want to add a new feature? Check BACKEND_GUIDE.md

---

**Generated with TypeDoc** - Full method documentation in the sidebar
