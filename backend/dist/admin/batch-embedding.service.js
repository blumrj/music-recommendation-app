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
 * Queries albums from two sources:
 * 1. Album table (saved albums)
 * 2. AlbumSurvey table (surveyed albums)
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
const album_embedding_orchestrator_1 = require("../modules/embeddings/album-embedding.orchestrator");
const logger_1 = require("../shared/logger");
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
        logger_1.logger.info("BATCH", "Starting batch embedding for all albums...");
        const stats = {
            processed: 0,
            created: 0,
            cached: 0,
            failed: 0,
            errors: []
        };
        try {
            // STEP 1: Fetch all unique albums from database
            logger_1.logger.info("BATCH", "Fetching all albums from database...");
            const albums = await this.fetchAllAlbums();
            logger_1.logger.info("BATCH", `Found ${albums.length} unique albums`);
            // STEP 2: For each album, compute/cache embedding
            logger_1.logger.info("BATCH", "Processing albums...");
            for (let i = 0; i < albums.length; i++) {
                const album = albums[i];
                const progress = `[${i + 1}/${albums.length}]`;
                try {
                    // Get or compute embedding from Last.fm tags
                    const embedding = await album_embedding_orchestrator_1.albumEmbeddingService.getOrComputeEmbedding(album.spotifyId, {
                        albumName: album.name,
                        artist: album.artist,
                        imageUrl: album.imageUrl
                    });
                    // Track whether it was cached or newly created
                    if (embedding.createdAt && embedding.updatedAt === embedding.createdAt) {
                        stats.created++;
                        logger_1.logger.info("BATCH", `${progress} ✓ Created: ${album.name}`);
                    }
                    else {
                        stats.cached++;
                        logger_1.logger.info("BATCH", `${progress} ○ Cached: ${album.name}`);
                    }
                    stats.processed++;
                }
                catch (error) {
                    stats.failed++;
                    const errorMsg = `Failed to embed ${album.name}: ${error.message}`;
                    stats.errors.push(errorMsg);
                    logger_1.logger.warn("BATCH", `${progress} ✗ ${errorMsg}`);
                }
            }
            // STEP 3: Summary
            logger_1.logger.info("BATCH", "─────────────────────────────────────────");
            logger_1.logger.info("BATCH", `Batch complete:`);
            logger_1.logger.info("BATCH", `  Processed: ${stats.processed}`);
            logger_1.logger.info("BATCH", `  Created:   ${stats.created}`);
            logger_1.logger.info("BATCH", `  Cached:    ${stats.cached}`);
            logger_1.logger.info("BATCH", `  Failed:    ${stats.failed}`);
            if (stats.errors.length > 0) {
                logger_1.logger.info("BATCH", `Errors:`);
                stats.errors.forEach(err => logger_1.logger.info("BATCH", `  - ${err}`));
            }
            logger_1.logger.info("BATCH", "─────────────────────────────────────────");
            return stats;
        }
        catch (error) {
            const msg = `Batch embedding failed: ${error.message}`;
            stats.errors.push(msg);
            logger_1.logger.error("BATCH", `CRITICAL ERROR: ${msg}`);
            throw error;
        }
    }
    /**
     * Fetch all unique albums from database
     *
     * Queries two sources and de-duplicates:
     * - Album table (user-saved albums)
     * - AlbumSurvey table (surveyed albums)
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
            logger_1.logger.info("BATCH", `Found ${savedAlbums.length} from Album table`);
        }
        catch (error) {
            logger_1.logger.warn("BATCH", `Failed to fetch from Album table: ${error.message}`);
        }
        // SOURCE 2: AlbumSurvey table (surveyed albums)
        try {
            const surveyed = await prisma.albumSurvey.findMany({
                select: {
                    albumId: true,
                    album: {
                        select: {
                            spotifyId: true,
                            title: true,
                            artist: true,
                            imageUrl: true
                        }
                    }
                }
            });
            for (const survey of surveyed) {
                if (survey.album.spotifyId && !seen.has(survey.album.spotifyId)) {
                    seen.add(survey.album.spotifyId);
                    albums.push({
                        spotifyId: survey.album.spotifyId,
                        name: survey.album.title,
                        artist: survey.album.artist,
                        imageUrl: survey.album.imageUrl || undefined
                    });
                }
            }
            logger_1.logger.info("BATCH", `Found ${surveyed.length} from AlbumSurvey table`);
        }
        catch (error) {
            logger_1.logger.warn("BATCH", `Failed to fetch from AlbumSurvey table: ${error.message}`);
        }
        logger_1.logger.info("BATCH", `Total unique albums: ${albums.length}`);
        return albums;
    }
    /**
     * Get default audio features (used when actual features unavailable)
     *
     * Represents "average" track - neutral starting point for embedding.
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
                const embedding = await album_embedding_orchestrator_1.albumEmbeddingService.getOrComputeEmbedding(album.spotifyId, {
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
//# sourceMappingURL=batch-embedding.service.js.map