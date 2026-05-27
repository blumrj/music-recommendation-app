"use strict";
/**
 * BATCH EMBEDDING SERVICE
 *
 * Phase 3A: Pre-compute 13D embeddings for all existing albums.
 *
 * MOTIVATION:
 * - Recommendations currently compute embeddings on-the-fly (slow)
 * - Pre-computing embeddings once = fast lookups later
 * - Enables analytics: which dimensions matter? which embeddings changed?
 *
 * ARCHITECTURE:
 * Queries albums from three sources:
 * 1. Album table (saved albums)
 * 2. AlbumSurvey table (surveyed albums)
 * 3. Favorite table (favorited albums)
 *
 * For each album:
 * - Fetch/use default audio features
 * - Call albumEmbeddingService.getOrComputeEmbedding()
 * - Get cached in AlbumEmotionalEmbedding if already exists
 * - Store if new
 *
 * USAGE:
 * ```typescript
 * const stats = await batchEmbeddingService.batchEmbedAllAlbums();
 * // { processed: 150, created: 120, cached: 30, failed: 0 }
 * ```
 *
 * @category Services
 * @module services/batch-embedding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchEmbeddingService = void 0;
const client_1 = require("@prisma/client");
const album_embedding_service_1 = require("./album/album-embedding.service");
const prisma = new client_1.PrismaClient();
/**
 * Batch Embedding Service
 *
 * Orchestrates pre-computation of embeddings for album discovery and analytics.
 *
 * @class BatchEmbeddingService
 */
class BatchEmbeddingService {
    /**
     * Batch embed all albums in the database
     *
     * Queries all unique albums from:
     * - Album table (user-saved albums)
     * - AlbumSurvey table (surveyed albums)
     * - Favorite table (favorited albums)
     *
     * De-duplicates by Spotify album ID, then computes/caches embeddings.
     *
     * @async
     * @returns {Promise<Object>} Statistics on batch operation
     * @returns {number} returns.processed - Total albums processed
     * @returns {number} returns.created - Newly computed embeddings
     * @returns {number} returns.cached - Already cached embeddings (skipped)
     * @returns {number} returns.failed - Failed embeddings
     * @returns {string[]} returns.errors - Error messages (if any)
     *
     * @throws {Error} On critical database errors (non-throwing for individual failures)
     *
     * STRATEGY:
     * - Fetch all albums across three tables
     * - De-duplicate by spotifyId/spotifyAlbumId
     * - For each: call getOrComputeEmbedding (handles caching)
     * - Track statistics
     * - Return summary
     *
     * @example
     * const stats = await batchEmbeddingService.batchEmbedAllAlbums();
     * console.log(`Processed ${stats.processed} albums`);
     * console.log(`Created ${stats.created} new embeddings`);
     * console.log(`Found ${stats.cached} cached embeddings`);
     * if (stats.errors.length > 0) {
     *   console.warn(`${stats.failed} failures:`, stats.errors);
     * }
     */
    async batchEmbedAllAlbums() {
        console.log("[BATCH] Starting batch embedding for all albums...");
        const stats = {
            processed: 0,
            created: 0,
            cached: 0,
            failed: 0,
            errors: []
        };
        try {
            // STEP 1: Fetch all unique albums from database
            console.log("[BATCH] Fetching all albums from database...");
            const albums = await this.fetchAllAlbums();
            console.log(`[BATCH] Found ${albums.length} unique albums`);
            // STEP 2: For each album, compute/cache embedding
            console.log("[BATCH] Processing albums...");
            for (let i = 0; i < albums.length; i++) {
                const album = albums[i];
                const progress = `[${i + 1}/${albums.length}]`;
                try {
                    // Get or compute embedding
                    const embedding = await album_embedding_service_1.albumEmbeddingService.getOrComputeEmbedding(album.spotifyId, this.getDefaultAudioFeatures(), {
                        albumName: album.name,
                        artist: album.artist,
                        imageUrl: album.imageUrl
                    });
                    // Track whether it was cached or newly created
                    if (embedding.createdAt && embedding.updatedAt === embedding.createdAt) {
                        stats.created++;
                        console.log(`${progress} ✓ Created: ${album.name}`);
                    }
                    else {
                        stats.cached++;
                        console.log(`${progress} ○ Cached: ${album.name}`);
                    }
                    stats.processed++;
                }
                catch (error) {
                    stats.failed++;
                    const errorMsg = `Failed to embed ${album.name}: ${error.message}`;
                    stats.errors.push(errorMsg);
                    console.warn(`${progress} ✗ ${errorMsg}`);
                }
            }
            // STEP 3: Summary
            console.log("[BATCH] ─────────────────────────────────────────");
            console.log(`[BATCH] Batch complete:`);
            console.log(`[BATCH]   Processed: ${stats.processed}`);
            console.log(`[BATCH]   Created:   ${stats.created}`);
            console.log(`[BATCH]   Cached:    ${stats.cached}`);
            console.log(`[BATCH]   Failed:    ${stats.failed}`);
            if (stats.errors.length > 0) {
                console.log(`[BATCH] Errors:`);
                stats.errors.forEach(err => console.log(`[BATCH]   - ${err}`));
            }
            console.log("[BATCH] ─────────────────────────────────────────");
            return stats;
        }
        catch (error) {
            const msg = `Batch embedding failed: ${error.message}`;
            stats.errors.push(msg);
            console.error(`[BATCH] CRITICAL ERROR: ${msg}`);
            throw error;
        }
    }
    /**
     * Fetch all unique albums from database
     *
     * Queries three sources and de-duplicates:
     * - Album table (user-saved albums)
     * - AlbumSurvey table (surveyed albums)
     * - Favorite table (favorited albums)
     *
     * @private
     * @async
     * @returns {Promise<Array>} Unique albums with required fields
     */
    async fetchAllAlbums() {
        // Use Set to track unique Spotify IDs (avoid duplicates)
        const seen = new Set();
        const albums = [];
        // SOURCE 1: Album table (user-saved albums)
        try {
            const savedAlbums = await prisma.album.findMany({
                select: { spotifyId: true, title: true, artist: true, imageUrl: true }
            });
            for (const album of savedAlbums) {
                if (album.spotifyId && !seen.has(album.spotifyId)) {
                    seen.add(album.spotifyId);
                    albums.push({
                        spotifyId: album.spotifyId,
                        name: album.title,
                        artist: album.artist,
                        imageUrl: album.imageUrl || undefined
                    });
                }
            }
            console.log(`[BATCH] Found ${savedAlbums.length} from Album table`);
        }
        catch (error) {
            console.warn(`[BATCH] Failed to fetch from Album table:`, error.message);
        }
        // SOURCE 2: AlbumSurvey table (surveyed albums)
        try {
            const surveyed = await prisma.albumSurvey.findMany({
                select: {
                    spotifyAlbumId: true,
                    albumName: true,
                    artist: true,
                    imageUrl: true
                }
            });
            for (const album of surveyed) {
                if (album.spotifyAlbumId && !seen.has(album.spotifyAlbumId)) {
                    seen.add(album.spotifyAlbumId);
                    albums.push({
                        spotifyId: album.spotifyAlbumId,
                        name: album.albumName,
                        artist: album.artist,
                        imageUrl: album.imageUrl || undefined
                    });
                }
            }
            console.log(`[BATCH] Found ${surveyed.length} from AlbumSurvey table`);
        }
        catch (error) {
            console.warn(`[BATCH] Failed to fetch from AlbumSurvey table:`, error.message);
        }
        // SOURCE 3: Favorite table (favorited albums)
        try {
            const favorites = await prisma.favorite.findMany({
                select: {
                    albumSpotifyId: true,
                    albumName: true,
                    artist: true,
                    imageUrl: true
                }
            });
            for (const album of favorites) {
                if (album.albumSpotifyId && !seen.has(album.albumSpotifyId)) {
                    seen.add(album.albumSpotifyId);
                    albums.push({
                        spotifyId: album.albumSpotifyId,
                        name: album.albumName,
                        artist: album.artist,
                        imageUrl: album.imageUrl || undefined
                    });
                }
            }
            console.log(`[BATCH] Found ${favorites.length} from Favorite table`);
        }
        catch (error) {
            console.warn(`[BATCH] Failed to fetch from Favorite table:`, error.message);
        }
        console.log(`[BATCH] Total unique albums: ${albums.length}`);
        return albums;
    }
    /**
     * Get default audio features (used when actual features unavailable)
     *
     * Represents "average" track - neutral starting point for embedding.
     * Used because Spotify audio-features endpoint is deprecated.
     *
     * @private
     * @returns {Record<string, number>} Default audio features
     */
    getDefaultAudioFeatures() {
        return {
            danceability: 0.5,
            energy: 0.5,
            loudness: -5,
            speechiness: 0,
            acousticness: 0.5,
            instrumentalness: 0,
            liveness: 0,
            valence: 0.5,
            tempo: 120,
            mode: 1,
            key: 0
        };
    }
    /**
     * Batch embed albums with progress reporting
     *
     * Same as batchEmbedAllAlbums but with periodic progress callback.
     * Useful for long-running batches with UI feedback.
     *
     * @async
     * @param {Function} onProgress - Called with (current, total) at intervals
     * @returns {Promise<Object>} Statistics object
     *
     * @example
     * await batchEmbeddingService.batchEmbedAllAlbumsWithProgress((current, total) => {
     *   console.log(`${current}/${total} (${Math.round(100 * current/total)}%)`);
     * });
     */
    async batchEmbedAllAlbumsWithProgress(onProgress) {
        const albums = await this.fetchAllAlbums();
        const total = albums.length;
        const stats = {
            processed: 0,
            created: 0,
            cached: 0,
            failed: 0,
            errors: []
        };
        for (let i = 0; i < total; i++) {
            const album = albums[i];
            try {
                const embedding = await album_embedding_service_1.albumEmbeddingService.getOrComputeEmbedding(album.spotifyId, this.getDefaultAudioFeatures(), {
                    albumName: album.name,
                    artist: album.artist,
                    imageUrl: album.imageUrl
                });
                if (embedding.createdAt && embedding.updatedAt === embedding.createdAt) {
                    stats.created++;
                }
                else {
                    stats.cached++;
                }
                stats.processed++;
            }
            catch (error) {
                stats.failed++;
                stats.errors.push(`${album.name}: ${error.message}`);
            }
            // Report progress
            if (onProgress) {
                onProgress(i + 1, total);
            }
        }
        return stats;
    }
}
exports.batchEmbeddingService = new BatchEmbeddingService();
