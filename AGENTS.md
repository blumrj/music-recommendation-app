# AI Agent Instructions for Music Recommendation App

This document helps AI agents understand the codebase structure, conventions, and how to be productive. For general coding principles, see [CLAUDE.md](CLAUDE.md).

---

## Quick Start for Agents

### Build & Run Commands

**Frontend** (React + Vite + TypeScript):
```bash
cd frontend
npm install
npm run dev          # Start dev server on http://localhost:5173
npm run build        # Production build
npm run lint         # ESLint + TypeScript check
```

**Backend** (Node + Express + Prisma):
```bash
cd backend
npm install
npm run dev          # Start dev server on http://localhost:3000
docker-compose up -d # Start PostgreSQL
npx prisma migrate dev --name <migration-name>  # Create migrations
npx prisma studio   # Open Prisma Studio for DB inspection
```

**Full Stack**:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## Architecture Overview

### Frontend Structure (`frontend/src/`)
```
components/      # Reusable UI components (Modal, AlbumGrid, ProgressBar, etc.)
pages/          # Page components (Home, Profile, Login, etc.)
services/       # API client (apiClient)
context/        # React Context (AuthContext, RecommendationsContext)
types/          # TypeScript interfaces (Recommendation, User, etc.)
utils/          # Helpers (parseApiError, calculateWindowPosition)
```

**Key Pattern**: Pages use `services/api.ts` → `useAuth()` context → components

### Backend Structure (`backend/src/`)
```
controllers/    # HTTP request handlers
services/       # Business logic (recommendation algorithm, weather context, etc.)
modules/        # Domain-specific logic (recommendations, context, users)
routes/         # Express route definitions
types/          # DTOs and interfaces
middleware/     # Auth, error handling
infrastructure/ # External API clients (Spotify, Weather, Last.fm)
utils/          # Helpers
```

**Key Pattern**: Routes → Controllers (validation) → Services (logic) → Database

---

## Frontend Conventions

### React Components
- **File naming**: `ComponentName.tsx` (PascalCase)
- **Functional components** with React Hooks
- **Props interface**: `interface ${ComponentName}Props { ... }`
- **Default exports**: `export default function ComponentName() { ... }`

**Example**:
```typescript
// src/components/Modal.tsx
interface ModalProps {
  title: string;
  onClose: () => void;
  overlay?: boolean;
  showClose?: boolean;
}

export default function Modal({ title, onClose, ...props }: ModalProps) {
  // Implementation
}
```

### API Integration Pattern
1. Define types in `frontend/src/types/index.ts`
2. Call `apiClient.method()` from `services/api.ts`
3. Use hooks from `context/` if state needs sharing
4. Show `ProgressBar` while loading
5. Display errors in styled div with retry button

**Example** ([Home.tsx](frontend/src/pages/Home.tsx)):
```typescript
const handleGetRecommendations = async () => {
  setLoadingRecommendations(true);
  setError(null);
  try {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const data = await apiClient.getRecommendations(lat, lon, userId);
      setRecommendations(data);
    });
  } catch (err) {
    setError(parseApiError(err) || "Failed to fetch");
  }
};
```

### Styling
- **Tailwind CSS** for all styling
- **Color variables**: `text-primary`, `text-secondary`, `bg-primary`, `bg-secondary`, etc.
- **Spacing**: `p-md`, `gap-4`, `mb-4` (Tailwind tokens)
- **Windows 98 UI**: Draggable modals with title bar styling

---

## Backend Conventions

### Controllers
- Handle HTTP parsing and validation
- Delegate business logic to services
- Catch service errors and translate to HTTP responses

**Example** ([RecommendationController](backend/src/controllers/recommendation.controller.ts)):
```typescript
async getRecommendations(req: Request, res: Response) {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "Missing params" });
  
  try {
    const recommendations = await recommendationService.generateRecommendations(...);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
}
```

### Services
- Contain business logic and external API calls
- Receive user input from controllers
- Return data in DTO format for HTTP response
- Document complex algorithms with inline comments

**Example** ([RecommendationService](backend/src/modules/recommendations/recommendation.service.ts)):
- Two-stage pipeline: candidate generation → multi-factor ranking
- Blends user emotional profile with weather context
- Returns top 10 albums with scores and metadata

### API Endpoints
All endpoints require authentication (`authMiddleware` validates JWT).

**Key endpoints**:
- `GET /api/recommendations?lat=X&lon=Y` - Get recommendations (returns 10 albums + weather)
- `GET /api/user/profile` - Get user profile
- `POST /api/user/profile/analyze` - Analyze taste profile from surveys
- `GET /api/albums/surveyed` - Get albums user surveyed

### Types & DTOs
- Defined in `backend/src/types/`
- Must be exported and used in frontend via `frontend/src/services/api.ts`
- Backend response shape determines frontend type shape

**Key types**:
- `Recommendation` - Album with metadata (id, name, artist, image, spotifyUrl)
- `RecommendationsResponse` - { recommendations[], weather{}, mood, cached, generatedAt }
- `WeatherContext` - { condition, temp, humidity, season, timeOfDay, contextModifier{} }

---

## Key Development Patterns

### Adding a New Feature (Full Stack)

1. **Define types** in `backend/src/types/` → Export to frontend
2. **Create backend endpoint**:
   - Add route in `backend/src/routes/`
   - Create controller method
   - Create service method with logic
3. **Integrate frontend**:
   - Add method to `frontend/src/services/api.ts`
   - Create component or update page to call API
   - Show loading state with `ProgressBar`
   - Display errors in standard error banner
4. **Test**:
   - Backend: Check endpoint manually or with tests
   - Frontend: Check component renders correct data

### Upgrading the Recommendation Algorithm

The architecture protects you from changes:
- Frontend always calls same endpoint: `GET /api/recommendations?lat=X&lon=Y`
- Backend returns same response shape
- Can rewrite `recommendationService.generateRecommendations()` without breaking frontend
- See [algorithm-upgrade-strategy.md](ALGORITHM_UPGRADE_STRATEGY.md) for details

---

## Common Development Tasks

### Environment Setup
1. **Copy `.env.example` files to `.env`** (creates `.env` files with all required variables):
   ```bash
   cd backend && cp .env.example .env
   cd ../frontend && cp .env.example .env.local
   ```
2. **Fill in API keys** in `backend/.env`:
   - Spotify: https://developer.spotify.com/dashboard
   - OpenWeatherMap: https://openweathermap.org/api (free tier: 1000 calls/day)
   - Last.fm: https://www.last.fm/api/account/create (optional for now)
3. **JWT Secrets**: Use strong random strings (min 32 chars each)
4. **Start Docker**: `docker-compose up -d` (in `backend/`)
5. **Run migrations**: `npx prisma migrate dev` (in `backend/`)

### Running the Full Stack
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3 (optional - for database inspection)
cd backend && npx prisma studio
```

### Debugging
- **Frontend**: Use React DevTools, check browser console
- **Backend**: Logs go to console, use `console.log()` or debugger
- **Database**: Use `npx prisma studio` to inspect data
- **API calls**: Check Network tab in browser DevTools

### Making Schema Changes
```bash
cd backend
# Edit prisma/schema.prisma
npx prisma migrate dev --name describe_change
# Prisma generates migration, applies to DB, updates client
```

---

## Troubleshooting Common Issues

For comprehensive troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md). Quick reference for most common issues:

### "Port 3000 already in use"
```bash
lsof -i :3000 && kill -9 <PID>  # macOS/Linux
netstat -ano | findstr :3000 && taskkill /PID <PID> /F  # Windows
```

### Database connection error
```bash
docker-compose up -d  # Start PostgreSQL
npx prisma migrate reset --force  # Reset if schema mismatch
```

### Missing `.env` file
```bash
cd backend && cp .env.example .env  # Fill in API keys
cd ../frontend && cp .env.example .env.local
```

### Authentication errors (401/403)
- Check JWT token in localStorage: `localStorage.getItem('token')`
- Verify `JWT_SECRET` in `.env` is correct
- If stuck, clear: `localStorage.clear()` and log in again

### "Recommendations endpoint returns empty"
- User must complete surveys first (need taste profile)
- Verify geolocation is working: `navigator.geolocation.getCurrentPosition()`
- Check Spotify API key is valid in backend logs
- Verify weather API is accessible

For more detailed solutions, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Known Issues & Limitations

### 13D Emotional Dimension Redundancy
**Status**: ⚠️ Known limitation affecting recommendation diversity

The recommendation algorithm uses a 13-dimensional emotional embedding space, but several dimensions are semantically overlapping:

**Overlapping pairs**:
- `arousal` ↔ `movement` (both measure "energy level") - ~70-80% correlated
- `tension` ↔ `arousal` (both measure "activation") - ~60-70% correlated
- `density` ↔ `spaciousness` (literally opposite) - perfect inverse correlation
- `warmth` ↔ `intimacy` (warmth already includes "intimate") - ~50-60% correlated

**Effect**: Albums may score similarly across multiple dimensions, reducing diversity in recommendations.

**Workarounds**:
- User surveys help define unique taste preferences that offset dimension redundancy
- Algorithm's multi-factor ranking (popularity, recency, diversity) adds variation
- See [CLAUDE.md](CLAUDE.md) → "Simplicity First" for why we haven't yet refactored

**Future improvement**: Merge redundant dimensions or apply PCA decorrelation (documented in [backend/src/config/emotional-dimensions.ts](backend/src/config/emotional-dimensions.ts) comments)

### External API Rate Limiting
**Status**: ⚠️ Production consideration

- **Spotify**: 100k requests/month (high threshold, but watch on high-traffic days)
- **OpenWeatherMap**: Free tier allows 1000 calls/day
- **Last.fm**: Some endpoints limit to 5 calls/second

**Current handling**: Results are cached in database by (userId, lat, lon) for 24 hours. Repeated requests for same location use cache.

**If you hit rate limits**: Stagger requests, increase cache TTL, or upgrade API plans.

---

## Testing & Debugging

### Manual API Testing
```bash
# Test backend endpoint directly (no frontend needed)
curl "http://localhost:3000/api/recommendations?lat=40.7128&lon=-74.0060" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Or use Postman/Insomnia GUI for easier testing
```

### View Real-Time Database Changes
```bash
cd backend && npx prisma studio
# Opens http://localhost:5555 - see all data, edit records directly
```

### Frontend Debugging
- **React DevTools**: Install browser extension, inspect component tree and state
- **Network tab**: Watch API calls, check request/response payloads and timing
- **Console**: Look for error messages or custom `console.log()` statements
- **localStorage**: `localStorage.getItem('token')` to check JWT token is persisted

### Backend Debugging
```bash
# Backend already logs to console, but add custom debugging:
console.log("Before recommendation:", { userId, lat, lon });
const recommendations = await recommendationService.generateRecommendations(...);
console.log("After recommendation:", recommendations.length, "albums found");

# Or use Node debugger (advanced):
# node --inspect-brk dist/index.js  # then open chrome://inspect
```

### Check External API Connectivity
```bash
# Test Spotify API
curl "https://api.spotify.com/v1/me" -H "Authorization: Bearer SPOTIFY_TOKEN"

# Test Weather API
curl "https://api.openweathermap.org/data/2.5/weather?lat=40.7128&lon=-74.0060&appid=YOUR_KEY"

# Check if APIs are accessible (no auth)
curl -I https://api.spotify.com/v1/me  # Should return 401 (unauthorized), not connection error
```

---

## Testing Strategy (Jest / Unit Tests)

Currently tests exist as:
- **Backend**: Manual tests in `admin-scripts/` (see `test-phase-3b.ts`)
- **Frontend**: No automated tests yet (TODO)

When adding tests, follow conventions:
- Backend: Create `*.test.ts` files next to source code, run with `npm test`
- Frontend: Create `*.test.tsx` files in `__tests__/` folder, use React Testing Library

---

## External API Integration Notes

### Spotify API
- **Rate limit**: 100,000 requests/month on free tier (very generous)
- **Auth**: OAuth 2.0 flow with refresh tokens (handled in [backend/src/services/auth.service.ts](backend/src/services/auth.service.ts))
- **Key endpoints used**: 
  - `/v1/me/top/tracks` - Get user's top tracks
  - `/v1/search?q=...&type=album` - Search albums
  - `/v1/audio-features/{id}` - Get album audio features
- **Caching**: Search results not cached (Spotify changes frequently); consider adding if response times are slow

### OpenWeatherMap API
- **Rate limit**: 1,000 calls/day on free tier  
- **Used for**: Real-time weather at user's location → mood modifier
- **Caching**: Results cached in DB for 24 hours by (lat, lon) coordinates
- **Fallback**: If API unavailable, system uses weather from previous cache or defaults to neutral mood

### Last.fm API
- **Rate limit**: 5 calls/second  
- **Currently**: Minimal usage (available for future features like "what artists played nearby")
- **Note**: If adding Last.fm integration, implement request throttling



### Before Implementing
- Check [CLAUDE.md](CLAUDE.md) for coding principles (Simplicity First, Surgical Changes, etc.)
- Understand if the change touches frontend only, backend only, or both
- Verify no breaking changes to existing APIs

### Code Review Checklist
- ✅ No unused imports or variables
- ✅ TypeScript strict mode - no `any` types
- ✅ No console.log() left in production code
- ✅ Error handling present (try-catch, validation)
- ✅ Loading and error UI states shown
- ✅ Surgical changes - only touch what's necessary

### Git Commit Convention
```
<type>: <description>

<detailed explanation if needed>

Example:
refactor: redesign home page with modal-based layout for albums and weather
- Replace inline album grid with draggable modals
- Add weather icon display in horizontal layout
- Fix TypeScript typing issues
```

---

## Linked Documentation

- [README.md](README.md) - Project overview and setup
- [CLAUDE.md](CLAUDE.md) - General coding principles (Think Before Coding, Simplicity First, etc.)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Comprehensive troubleshooting guide for common issues
- [backend/README.md](backend/README.md) - Backend-specific documentation
- [backend/EMBEDDINGS_QUICK_REFERENCE.md](backend/EMBEDDINGS_QUICK_REFERENCE.md) - Embeddings system quick reference & index
- [backend/EMBEDDINGS_ARCHITECTURE.md](backend/EMBEDDINGS_ARCHITECTURE.md) - Complete embeddings architecture guide
- [backend/EMBEDDINGS_CODE_GUIDE.md](backend/EMBEDDINGS_CODE_GUIDE.md) - Line-by-line code walkthrough for all embedding files
- [backend/prisma/schema.prisma](backend/prisma/schema.prisma) - Database schema
- Backend API documentation in code comments

---

## Quick Reference

| Task | Location |
|------|----------|
| Setup environment | Copy `backend/.env.example` → `backend/.env`, fill in API keys |
| Add new page | `frontend/src/pages/PageName.tsx` |
| Add new component | `frontend/src/components/ComponentName.tsx` |
| Call API | Update `frontend/src/services/api.ts` |
| Define type | `frontend/src/types/index.ts` (exported from backend) |
| Add endpoint | `backend/src/routes/*.routes.ts` + controller + service |
| Change DB schema | Edit `backend/prisma/schema.prisma` then run `npx prisma migrate dev` |
| Add context state | `frontend/src/context/ContextName.tsx` |
| Style component | Use Tailwind classes (e.g., `p-md`, `text-primary`, `bg-secondary`) |
| View database | Run `npx prisma studio` in `backend/` folder |
| Debug API | Use Network tab in browser DevTools, or `curl` command to test endpoints |
| Check logs | Backend: Terminal output; Frontend: Browser console (F12) |

