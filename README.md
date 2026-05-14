# On Windows PowerShell
@"
# Music Recommendation App

Emotional music recommendation system that uses weather context and a multi-dimensional emotional embedding space to generate personalized album recommendations.

## Features

- **7D Emotional Embeddings**: valence, arousal, tension, warmth, intimacy, density, groundedness
- **Weather-Based Context**: Real-time weather influences recommendations
- **Last.fm Discovery**: Expands music graph through artist relationships
- **Multi-Signal Fusion**: Blends emotional tags, genre priors, artist embeddings, and global priors
- **Two-Stage Pipeline**: Candidate generation → emotional ranking
- **User Profiles**: Learns user taste from album surveys

## Tech Stack

**Backend:**
- Node.js + TypeScript + Express.js
- PostgreSQL + Prisma ORM
- Spotify API + Last.fm API + OpenWeatherMap API
- FastText embeddings for semantic similarity

**Frontend:**
- React + TypeScript + Vite
- TailwindCSS for styling
- Context API for state management


## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Spotify Developer Account
- Last.fm API Key
- OpenWeatherMap API Key

### Setup

1. Clone repository:
\`\`\`bash
git clone https://github.com/YOUR_USERNAME/music-recommendation-app.git
cd music-recommendation-app
\`\`\`

2. Setup environment variables:
\`\`\`bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your API keys
\`\`\`

3. Start services:
\`\`\`bash
docker-compose up -d
\`\`\`

4. Install dependencies:
\`\`\`bash
cd backend && npm install
cd ../frontend && npm install
\`\`\`

5. Run migrations:
\`\`\`bash
cd backend
npx prisma migrate dev
\`\`\`

6. Start development:
\`\`\`bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
\`\`\`

## Architecture

### Recommendation Pipeline

1. **User Profile**: 7D emotional profile from surveyed albums
2. **Weather Context**: Real-time weather → emotional modifiers
3. **Candidate Generation**: Last.fm discovery → ~200-500 candidates
4. **Emotional Ranking**: Score candidates with 4-factor model
5. **Final Selection**: Top 10 emotionally similar albums

## Development

### Key Services

- **recommendation.service.ts** - Main orchestrator
- **album-embedding.service.ts** - Compute 7D embeddings
- **signal-fusion.service.ts** - Blend multiple signals
- **candidate-pool.service.ts** - Generate candidates
- **weather.service.ts** - Weather context
