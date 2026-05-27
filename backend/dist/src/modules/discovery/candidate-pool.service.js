"use strict";
/**
 * CANDIDATE POOL SERVICE
 *
 * Orchestrates the complete Last.fm-based discovery pipeline.
 *
 * PIPELINE:
 * 1. Extract seed artists from user library
 * 2. Expand via Last.fm discovery
 * 3. Add exploratory candidates
 * 4. Filter invalid candidates
 * 5. Ensure embeddings exist
 * 6. Return ~200-500 clean candidates for emotional ranking
 *
 * PHILOSOPHY:
 * The candidate pool is the INPUT to the emotional recommendation engine.
 * Quality of the pool determines quality of recommendations.
 *
 * Better to have 300 diverse candidates ranked emotionally
 * than 30 similar candidates from Spotify.
 *
 * @category Services
 * @module services/candidate-pool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidatePoolService = void 0;
const client_1 = require("@prisma/client");
const artist_expansion_service_1 = require("./artist-expansion.service");
const lastfm_discovery_service_1 = require("./lastfm-discovery.service");
const exploration_service_1 = require("./exploration.service");
const album_embedding_orchestrator_1 = require("../embeddings/album-embedding.orchestrator");
const prisma = new client_1.PrismaClient();
/**
 * Candidate Pool Service
 *
 * Manages the complete discovery pipeline.
 *
 * @class CandidatePoolService
 */
class CandidatePoolService {
    /**
     * Generate complete candidate pool for recommendations
     *
     * PIPELINE:
     * 1. Extract seed artists from user's saved + surveyed albums
     * 2. Expand via Last.fm discovery (similar artists → top albums)
     * 3. Add exploratory candidates (random emotional tags)
     * 4. Filter invalid candidates (no duplicates, no already-saved, valid embeddings)
     * 5. Return ~200-500 clean candidates
     *
     * @async
     * @param {string} userId - User ID to generate pool for
     * @param {number} explorationRatio - Fraction of pool for exploratory albums (default 0.2)
     * @param {number} targetPoolSize - Desired pool size before filtering (default 400)
     *
     * @returns {Promise<CleanAlbumCandidate[]>} Ready-to-rank album candidates
     *
     * @throws {Error} If critical stage fails (e.g., no seed artists)
     *
     * @example
     * const pool = await service.generateCandidatePool(userId, 0.2, 400);
     * // Returns: 150-300 clean candidates ready for emotional ranking
     */
    async generateCandidatePool(userId, explorationRatio = 0.2, targetPoolSize = 400) {
        console.log(`\n${"═".repeat(70)}`);
        console.log(`[POOL] Starting candidate pool generation for user ${userId}...`);
        console.log(`[POOL] Target: ${targetPoolSize} candidates, Exploration: ${(explorationRatio * 100).toFixed(0)}%`);
        console.log(`${"═".repeat(70)}\n`);
        try {
            // ─────────────────────────────────────────────────────────────
            // STEP 1: Extract seed artists from user library
            // ─────────────────────────────────────────────────────────────
            console.log(`[POOL] STEP 1: Extracting seed artists...`);
            const seedArtists = await artist_expansion_service_1.artistExpansionService.getSeedArtists(userId, 10);
            if (seedArtists.length === 0) {
                console.warn(`[POOL] ⚠️  No seed artists found for user ${userId}`);
                console.warn(`[POOL] User must have saved or surveyed albums to generate recommendations`);
                return [];
            }
            const seedArtistNames = seedArtists.map(a => a.name);
            console.log(`[POOL] ✓ Extracted ${seedArtistNames.length} seed artists`);
            // ─────────────────────────────────────────────────────────────
            // STEP 2: Expand via Last.fm discovery
            // ─────────────────────────────────────────────────────────────
            console.log(`[POOL] STEP 2: Expanding via Last.fm discovery...`);
            const discovered = await lastfm_discovery_service_1.lastfmDiscoveryService.expandSimilarArtists(seedArtistNames, 6, // 6 similar artists per seed
            4 // 4 top albums per related artist
            );
            if (discovered.length === 0) {
                console.warn(`[POOL] ⚠️  Last.fm discovery returned no albums`);
                return [];
            }
            console.log(`[POOL] ✓ Discovered ${discovered.length} albums from Last.fm`);
            // ─────────────────────────────────────────────────────────────
            // STEP 3: Add exploratory candidates
            // ─────────────────────────────────────────────────────────────
            console.log(`[POOL] STEP 3: Adding exploratory candidates...`);
            const withExploration = await exploration_service_1.explorationService.addExploratoryAlbums(discovered, targetPoolSize, explorationRatio);
            console.log(`[POOL] ✓ Pool with exploration: ${withExploration.length} albums`);
            // ─────────────────────────────────────────────────────────────
            // STEP 4: Filter invalid candidates
            // ─────────────────────────────────────────────────────────────
            console.log(`[POOL] STEP 4: Filtering invalid candidates...`);
            const filtered = await this.filterCandidates(userId, withExploration);
            console.log(`[POOL] ✓ After filtering: ${filtered.length} candidates`);
            // ─────────────────────────────────────────────────────────────
            // STEP 5: Ensure embeddings exist
            // ─────────────────────────────────────────────────────────────
            console.log(`[POOL] STEP 5: Ensuring embeddings for all candidates...`);
            const withEmbeddings = await this.ensureEmbeddings(filtered);
            console.log(`[POOL] ✓ Embeddings ensured for ${withEmbeddings.length} candidates`);
            // ─────────────────────────────────────────────────────────────
            // SUMMARY
            // ─────────────────────────────────────────────────────────────
            console.log(`\n[POOL] ✅ CANDIDATE POOL GENERATION COMPLETE`);
            console.log(`[POOL] Seeds: ${seedArtistNames.length} artists → Discovery: ${discovered.length} → Final: ${withEmbeddings.length}`);
            console.log(`[POOL] Sources: ${this.countBySource(withEmbeddings)}`);
            console.log(`${"═".repeat(70)}\n`);
            return withEmbeddings;
        }
        catch (error) {
            console.error(`[POOL] ❌ FAILED:`, error.message);
            throw error;
        }
    }
    /**
     * Filter invalid candidates
     *
     * FILTERS:
     * - Already saved by user (won't recommend what they already have)
     * - Already surveyed by user (already in profile)
     * - Duplicates (same album name + artist)
     * - Invalid embeddings (confidence < 0.2)
     *
     * @private
     * @async
     * @param {string} userId - User ID
     * @param {AlbumCandidate[]} candidates - Raw candidates from discovery
     *
     * @returns {Promise<CleanAlbumCandidate[]>} Filtered candidates
     */
    async filterCandidates(userId, candidates) {
        console.log(`[POOL-FILTER] Starting with ${candidates.length} candidates...`);
        const startCount = candidates.length;
        let current = candidates;
        // Filter 1: Remove duplicates by (albumName, artist)
        console.log(`[POOL-FILTER]   Filtering duplicates...`);
        const seen = new Set();
        const noDupes = current.filter(album => {
            const key = `${album.albumName.toLowerCase()}|${album.artist.toLowerCase()}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
        console.log(`[POOL-FILTER]   Duplicates removed: ${current.length} → ${noDupes.length}`);
        current = noDupes;
        // Filter 2: Remove albums user already saved
        console.log(`[POOL-FILTER]   Filtering already-saved albums...`);
        const savedAlbums = await prisma.favorite.findMany({
            where: { userId },
            select: { albumSpotifyId: true }
        });
        const savedIds = new Set(savedAlbums.map(s => s.albumSpotifyId));
        const notSaved = current.filter(album => {
            if (album.spotifyAlbumId && savedIds.has(album.spotifyAlbumId)) {
                return false;
            }
            return true;
        });
        console.log(`[POOL-FILTER]   Saved albums removed: ${current.length} → ${notSaved.length}`);
        current = notSaved;
        // Filter 3: Remove albums user already surveyed
        console.log(`[POOL-FILTER]   Filtering already-surveyed albums...`);
        const surveyedAlbums = await prisma.albumSurvey.findMany({
            where: { userId },
            select: { spotifyAlbumId: true }
        });
        const surveyedIds = new Set(surveyedAlbums.map(s => s.spotifyAlbumId));
        const notSurveyed = current.filter(album => {
            if (album.spotifyAlbumId && surveyedIds.has(album.spotifyAlbumId)) {
                return false;
            }
            return true;
        });
        console.log(`[POOL-FILTER]   Surveyed albums removed: ${current.length} → ${notSurveyed.length}`);
        current = notSurveyed;
        // Filter 4: Mark low-confidence albums
        const highConfidence = current.filter(album => album.confidence >= 0.2);
        console.log(`[POOL-FILTER]   Low-confidence filtered: ${current.length} → ${highConfidence.length}`);
        const removed = startCount - highConfidence.length;
        console.log(`[POOL-FILTER] ✓ Total removed: ${removed}, Remaining: ${highConfidence.length}`);
        return highConfidence;
    }
    /**
     * Ensure all candidates have valid 7D embeddings
     *
     * STRATEGY:
     * - Process embeddings in parallel batches (5 at a time) for speed
     * - Check if embedding exists in database
     * - If missing: compute from Last.fm tags
     * - Skip if computation fails (log warning)
     *
     * @private
     * @async
     * @param {CleanAlbumCandidate[]} candidates - Candidates to ensure embeddings for
     *
     * @returns {Promise<CleanAlbumCandidate[]>} Candidates with embeddings
     */
    async ensureEmbeddings(candidates) {
        console.log(`[POOL-EMBED] Ensuring embeddings for ${candidates.length} candidates (parallel batches)...`);
        const withEmbeddings = [];
        let embedded = 0;
        let failed = 0;
        const BATCH_SIZE = 5; // Process 5 at a time to avoid overwhelming Last.fm
        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            // Process batch in parallel
            const results = await Promise.allSettled(batch.map(album => album_embedding_orchestrator_1.albumEmbeddingService.getOrComputeEmbedding(album.spotifyAlbumId, {}, // No audio features (Last.fm-only)
            {
                albumName: album.albumName,
                artist: album.artist,
                imageUrl: album.imageUrl,
                spotifyUrl: album.spotifyUrl
            })));
            // Collect successful embeddings
            for (let j = 0; j < batch.length; j++) {
                if (results[j].status === 'fulfilled') {
                    withEmbeddings.push(batch[j]);
                    embedded++;
                }
                else {
                    failed++;
                    console.warn(`[POOL-EMBED] Failed to embed "${batch[j].albumName}" by ${batch[j].artist}:`, results[j].reason?.message || 'Unknown error');
                }
            }
            // Log progress
            const processed = Math.min(i + BATCH_SIZE, candidates.length);
            console.log(`[POOL-EMBED] Progress: ${processed}/${candidates.length}`);
        }
        console.log(`[POOL-EMBED] ✓ Embedding complete: ${embedded} success, ${failed} failed`);
        return withEmbeddings;
    }
    /**
     * Count candidates by discovery source
     *
     * Utility for logging/debugging.
     *
     * @private
     * @param {CleanAlbumCandidate[]} candidates - Candidates to count
     *
     * @returns {string} Formatted source breakdown
     */
    countBySource(candidates) {
        const counts = new Map();
        for (const album of candidates) {
            counts.set(album.source, (counts.get(album.source) || 0) + 1);
        }
        const parts = Array.from(counts.entries()).map(([source, count]) => `${count} ${source}`);
        return parts.join(", ");
    }
}
exports.candidatePoolService = new CandidatePoolService();
