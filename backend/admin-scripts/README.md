# Admin Scripts

**Location:** `backend/admin-scripts/`

These are maintenance and administrative CLI tools that support the music recommendation application. They are **not** part of the normal runtime application flow. Use these scripts for database operations, testing, and system maintenance.

---

## Scripts

### 1. `batch-embed.ts`

**Purpose:** Pre-compute 13D emotional embeddings for all albums in the database.

**When to Use:**
- Initial database population with embeddings
- Backfill embeddings if they're missing
- Periodic re-computation for consistency

**Usage:**
```bash
npx ts-node admin-scripts/batch-embed.ts
```

**What It Does:**
1. Fetches all albums from the database
2. For each album, computes a 13-dimensional emotional embedding
3. Caches results to avoid re-computation
4. Generates summary statistics

**Expected Output:**
```
[BATCH] Starting batch embedding for all albums...
[BATCH] Found 150 unique albums
[1/150] ✓ Created: Album Name
[2/150] ○ Cached: Another Album
...
[BATCH] Batch complete:
[BATCH]   Processed: 150
[BATCH]   Created:   120
[BATCH]   Cached:    30
[BATCH]   Failed:    0
```

**Performance:**
- Processes ~100-200 albums per minute (depends on network)
- Creates HTTP requests to external services (Last.fm, etc.)
- Consider running during off-peak hours for large databases

---

### 2. `batch-enrich.ts`

**Purpose:** Re-enrich album embeddings with Last.fm genre tags.

**When to Use:**
- Backfill enrichment for albums created before enrichment system
- Refresh tags if Last.fm data has been updated
- Manual recovery if Last.fm API was temporarily unavailable

**Usage:**
```bash
npx ts-node admin-scripts/batch-enrich.ts
```

**What It Does:**
1. Fetches all existing album embeddings from database
2. For each album, queries Last.fm for genre/mood tags
3. Computes enriched emotional dimensions using tags
4. Updates database with enriched values
5. Tracks enrichment status (audio-only → enriched)

**Expected Output:**
```
[BATCH-ENRICH] Starting enrichment process...
[BATCH-ENRICH] Found 150 albums to process
[1/150] ✓ Enriched: Album Name (audio-only → enriched)
[2/150] ○ Skipped (already enriched): Another Album
...
[BATCH-ENRICH] Enrichment complete:
[BATCH-ENRICH]   Processed: 150
[BATCH-ENRICH]   Enriched: 45
[BATCH-ENRICH]   Skipped: 100
[BATCH-ENRICH]   Failed: 5
```

**Performance:**
- ~1-2 seconds per album (depends on Last.fm API speed)
- Can take 5-10+ minutes for large databases
- Last.fm API has rate limits (60 requests per minute)

**Enrichment Status:**
- `audio-only`: Uses only Spotify audio features (danceability, energy, etc.)
- `enriched`: Uses Last.fm tags plus audio features for more accurate profiling
- `pending`: No status yet (shouldn't happen in normal operation)

---

### 3. `test-phase-3b.ts`

**Purpose:** Test the complete Phase 3B flow: survey collection → user profile generation → recommendation readiness.

**When to Use:**
- Validating the survey-to-profile pipeline
- Testing profile generation after database schema changes
- Debugging user profile computation issues
- Verifying system before deploying to production

**Usage:**
```bash
npx ts-node admin-scripts/test-phase-3b.ts
```

**What It Does:**
1. **Setup**: Creates or retrieves a test user
2. **Test Albums**: Creates 5 test albums (Pink Floyd, Beatles, Radiohead, Joy Division, Björk)
3. **Surveys**: Simulates user survey responses for albums
4. **Profile Generation**: Computes 13D user profile from surveys
5. **Profile Saving**: Stores profile to database
6. **Verification**: Retrieves profile to confirm correctness
7. **Recommendation Simulation**: Tests the profile in a mock recommendation scenario
8. **Cleanup**: Removes all test data

**Expected Output:**
```
======================================================================
     PHASE 3B TEST: Survey System → 13D Profile Generation
======================================================================

[SETUP] Creating/getting test user...
✓ Test user ready: test-phase-3b-user

[SETUP] Creating test albums with embeddings...
✓ Created 5 test albums

[STEP 1] Creating test user and surveys...
✓ User test-phase-3b-user created with 5 surveys

... (steps 2-9) ...

======================================================================
     ✨ PHASE 3B TEST SUCCESSFUL ✨
======================================================================

✅ Survey System Migration Complete:
   - UserProfileService created and working
   - 13D embeddings averaged correctly
   - Profile saved to database
   - Ready for recommendation algorithm
```

**What Gets Tested:**
- User creation and retrieval
- Album embedding computation
- Survey creation and retrieval
- 13D profile generation from surveys
- Profile storage and retrieval
- Weather modifier application
- Complete end-to-end recommendation flow

**Test Data Cleanup:**
- All test data is automatically removed after the script completes
- No manual cleanup needed
- Safe to run multiple times

---

## Common Tasks

### Run All Admin Tasks Sequentially

```bash
echo "Step 1: Batch embedding..."
npx ts-node admin-scripts/batch-embed.ts

echo "Step 2: Batch enrichment..."
npx ts-node admin-scripts/batch-enrich.ts

echo "Step 3: Verify with test..."
npx ts-node admin-scripts/test-phase-3b.ts
```

### Schedule with Cron (Linux/macOS)

```bash
# Re-enrich embeddings weekly at 2 AM
0 2 * * 0 cd /path/to/backend && npx ts-node admin-scripts/batch-enrich.ts
```

### Monitor Progress

Add logging redirects:
```bash
npx ts-node admin-scripts/batch-embed.ts | tee logs/batch-embed-$(date +%Y%m%d_%H%M%S).log
```

---

## Environment Variables

All scripts require the same environment variables as the main application:

```bash
# .env or .env.local
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
LASTFM_API_KEY=your_lastfm_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/music_db
```

See `backend/.env.example` for complete configuration.

---

## Error Handling

### Common Issues

**"Failed to fetch album tags"**
- Last.fm API might be down
- API rate limit reached (60 requests/minute)
- Album name too obscure for Last.fm
- Run again later or manually fix in database

**"Database connection failed"**
- Verify `DATABASE_URL` is correct
- Database server must be running
- User must have write permissions

**"Spotify token expired"**
- Refresh token needed (automatic in normal app flow)
- For batch scripts, ensure credentials are valid

### Retrying Failed Albums

Most scripts skip already-processed albums and only retry failed ones:

```bash
# Run again - will skip successful albums and retry failures
npx ts-node admin-scripts/batch-enrich.ts
```

---

## Development Notes

### Running from Different Directories

These scripts use relative import paths (`../src/services/...`), so they must be run from the repository root:

```bash
# ✅ Correct
cd music-recommendation-app/backend
npx ts-node admin-scripts/batch-embed.ts

# ❌ Won't work
cd music-recommendation-app/backend/admin-scripts
npx ts-node batch-embed.ts
```

### Adding New Admin Scripts

Follow this template:

```typescript
#!/usr/bin/env ts-node
/**
 * SCRIPT NAME
 * 
 * What this script does
 * 
 * USAGE:
 * ```bash
 * npx ts-node admin-scripts/script-name.ts
 * ```
 */

import dotenv from "dotenv";
dotenv.config();

async function main() {
  try {
    // Implementation here
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
```

---

## Performance Tuning

### For Large Databases (>1000 albums)

**Batch embed:**
- Consider splitting into chunks of 100 albums
- Run during off-peak hours
- Monitor CPU/network usage

**Batch enrich:**
- May take 1-2 hours for 1000+ albums
- Run overnight or schedule for maintenance window
- Last.fm API rate limits: 60 requests/minute

### Database Considerations

- Ensure database has sufficient disk space for embeddings
- Run `VACUUM` on PostgreSQL after large batch operations
- Consider creating indexes on `albumEmotionalEmbedding.spotifyAlbumId`

---

## Support & Questions

For issues with these scripts:
1. Check error messages in console output
2. Verify environment variables are set
3. Ensure database is running and accessible
4. Check Last.fm API availability
5. Review logs in `backend/logs/` if available

---

**Last Updated:** 2024
**Maintenance Level:** Stable
**Runtime:** TypeScript/Node.js
