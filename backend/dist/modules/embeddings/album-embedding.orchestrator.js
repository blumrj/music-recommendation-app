"use strict";
/**
 * ALBUM EMBEDDING SERVICE
 *
 * Computes and manages 7D emotional embeddings for albums using Last.fm tags.
 *
 * RESPONSIBILITY:
 * - Map Last.fm tags → 7D emotional dimensions (via semantic similarity)
 * - Fuse multiple signals (emotional tags, genre, artist, global prior)
 * - Compute confidence scores
 * - Cache embeddings for performance
 *
 * ARCHITECTURE:
 * Embeddings are the foundation of the vector space recommendation system.
 * Each album gets a fixed 7D point that represents its intrinsic emotional properties.
 * Data source: Last.fm community tags (no external audio features)
 *
 * @category Services
 * @module services/album-embedding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumEmbeddingOrchestrator = exports.albumEmbeddingService = void 0;
const lastfm_client_1 = require("../../infrastructure/lastfm/lastfm-client");
const signal_fusion_service_1 = require("./signal-fusion.service");
const tag_classifier_service_1 = require("./tag-classifier.service");
const logger_1 = require("../../shared/logger");
/**
 * Album Embedding Service
 *
 * Orchestrates computation and caching of 7D album embeddings from Last.fm tags.
 *
 * @class AlbumEmbeddingService
 */
class AlbumEmbeddingService {
    /**
   * CREATE EMBEDDING FROM LAST.FM TAGS ONLY
   *
   *
   * Flow:
   * 1. Fetch tags from Last.fm (album → artist fallback)
   * 2. If tags found: Classify tags (emotional/genre/metadata)
   * 3. Call signal fusion service to blend all signals
   * 4. Return fused embedding + confidence
   * 5. If no tags: Return null + "no-data" status (don't create fake embedding)
   *
   * @private
   * @async
   * @param {string} albumName - Album name
   * @param {string} artist - Artist name
   * @returns {Promise<{ embedding: EmotionalVector | null; tags: ParsedLastfmTag[]; enrichmentStatus: string; confidence: number }>}
   */
    async createEmbeddingFromLastfm(albumName, artist) {
        logger_1.logger.info("EMBEDDING", `Creating Last.fm-only embedding for "${albumName}" by ${artist}`);
        try {
            // STEP 1: Fetch album tags
            let tags = await lastfm_client_1.lastfmClient.fetchAlbumTags(artist, albumName);
            // STEP 2: Fallback to artist tags if album not found
            if (tags.length === 0) {
                logger_1.logger.info("EMBEDDING", `Album not found in Last.fm, trying artist...`);
                tags = await lastfm_client_1.lastfmClient.fetchArtistTags(artist);
            }
            // STEP 3: If we got tags, use signal fusion to create embedding
            if (tags.length > 0) {
                logger_1.logger.info("EMBEDDING", `Got ${tags.length} tags, using signal fusion...`);
                // Classify tags into emotional, genre, metadata, other
                const classified = tag_classifier_service_1.tagClassifierService.classify(tags);
                logger_1.logger.info("EMBEDDING", `Classified tags: ${classified.metrics.emotionalCount} emotional, ${classified.metrics.genreCount} genre, ${classified.metrics.metadataCount} metadata`);
                // Extract tag strings for signal fusion
                const emotionalTags = classified.emotional;
                const genreTags = classified.genre;
                logger_1.logger.info("EMBEDDING", `Calling signal fusion with emotional=${emotionalTags.length}, genre=${genreTags.length}, artist=${artist}`);
                // STEP 4: Fuse all signals (emotional + genre + artist + global)
                const fusionResult = await signal_fusion_service_1.signalFusionService.fuseSignals({
                    emotionalTags,
                    genreTags,
                    artistName: artist
                });
                logger_1.logger.info("EMBEDDING", `Signal fusion complete: confidence=${fusionResult.confidence.toFixed(2)}`);
                logger_1.logger.withData("EMBEDDING", "Signal breakdown", {
                    emotional: `${fusionResult.signalBreakdown.emotional.weight.toFixed(2)}`,
                    genre: `${fusionResult.signalBreakdown.genre.weight.toFixed(2)}`,
                    artist: `${fusionResult.signalBreakdown.artist.weight.toFixed(2)}`,
                    global: `${fusionResult.signalBreakdown.global.weight.toFixed(2)}`
                });
                return {
                    embedding: fusionResult.embedding,
                    tags,
                    enrichmentStatus: "enriched",
                    confidence: fusionResult.confidence
                };
            }
            else {
                logger_1.logger.info("EMBEDDING", `No Last.fm tags found - cannot create embedding without data`);
                return {
                    embedding: null,
                    tags: [],
                    enrichmentStatus: "no-data",
                    confidence: 0.0
                };
            }
        }
        catch (error) {
            logger_1.logger.error("EMBEDDING", `Last.fm-only creation failed: ${error.message}`);
            return {
                embedding: null,
                tags: [],
                enrichmentStatus: "failed-lastfm",
                confidence: 0.0
            };
        }
    }
    /**
     * Private method to generate a default/unknown embedding
     * Used when no Last.fm data available
     *
     * @private
     * @returns {EmotionalVector} Default neutral embedding
     */
    createDefaultEmbedding() {
        return {
            valence: 0.5,
            arousal: 0.5,
            tension: 0.5,
            warmth: 0.5,
            intimacy: 0.5,
            density: 0.5,
            groundedness: 0.5
        };
    }
    /**
     * Get or compute embedding for an album
     *
     * STRATEGY: Compute on-demand from Last.fm tags (in-memory, no database caching)
     *
     * Data source: Last.fm tags only (no Spotify audio features)
     *
     * @async
     * @param {Object} metadata - Album metadata
     *
     * @returns {Promise<AlbumEmbedding>} 7D album embedding
     *
     * @example
     * const embedding = await embeddingService.getOrComputeEmbedding(
     *   { albumName, artist, imageUrl }
     * );
     */
    async getOrComputeEmbedding(metadata) {
        if (!metadata?.albumName || !metadata?.artist) {
            logger_1.logger.info("EMBEDDING", `No album metadata - returning neutral embedding`);
            return this.createDefaultEmbedding();
        }
        // Compute embedding from Last.fm tags (in-memory, no DB)
        const result = await this.createEmbeddingFromLastfm(metadata.albumName, metadata.artist);
        const embedding = result.embedding || this.createDefaultEmbedding();
        return {
            valence: embedding.valence,
            arousal: embedding.arousal,
            tension: embedding.tension,
            warmth: embedding.warmth,
            intimacy: embedding.intimacy,
            density: embedding.density,
            groundedness: embedding.groundedness,
            derivedFrom: "lastfm",
            confidence: result.confidence || 0.5,
            enrichmentStatus: result.enrichmentStatus,
            albumName: metadata?.albumName,
            artist: metadata?.artist,
            imageUrl: metadata?.imageUrl,
            spotifyUrl: metadata?.spotifyUrl,
            tags: result.tags && result.tags.length > 0 ? result.tags : undefined
        };
    }
}
exports.albumEmbeddingService = new AlbumEmbeddingService();
exports.albumEmbeddingOrchestrator = exports.albumEmbeddingService;
//# sourceMappingURL=album-embedding.orchestrator.js.map