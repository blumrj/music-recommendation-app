"use strict";
/**
 * ALBUM EMBEDDING SERVICE
 *
 * Computes and manages 13D emotional embeddings for albums.
 *
 * RESPONSIBILITY:
 * - Map Spotify audio features → 13D emotional dimensions
 * - Compute confidence scores
 * - Cache embeddings for performance
 * - Support multiple derivation methods (audio features, surveys, hybrid)
 *
 * ARCHITECTURE:
 * Embeddings are the foundation of the vector space recommendation system.
 * Each album gets a fixed 13D point that represents its intrinsic emotional properties.
 *
 * @category Services
 * @module services/album-embedding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumEmbeddingService = void 0;
const client_1 = require("@prisma/client");
const lastfm_client_1 = require("../../utils/lastfm-client");
const album_enrichment_service_1 = require("./album-enrichment.service");
const signal_fusion_service_1 = require("../signal-fusion.service");
const tag_classifier_service_1 = require("../tag-classifier.service");
const prisma = new client_1.PrismaClient();
/**
 * Album Embedding Service
 *
 * Orchestrates computation and caching of 13D album embeddings.
 *
 * @class AlbumEmbeddingService
 */
class AlbumEmbeddingService {
    /**
     * Compute 7D embedding from Spotify audio features
     *
     * Maps 11 Spotify audio metrics to our 7D emotional space.
     *
     * MAPPING STRATEGY:
     * - Direct mappings: valence, arousal (already psychologically validated)
     * - Composite mappings: combine multiple features for richness
     * - Inferred: tension from mode + harmonic dissonance proxies
     *
     * CONFIDENCE CALCULATION:
     * - Higher for well-known albums (more listener data)
     * - Lower for niche albums (less validation)
     * - Based on track count + aggregate data quality
     *
     * @private
     * @async
     * @param {Object} audioFeatures - Spotify audio features
     * @param {number} audioFeatures.valence - Spotify valence (0-1)
     * @param {number} audioFeatures.energy - Spotify energy (0-1)
     * @param {number} audioFeatures.acousticness - Acousticness (0-1)
     * @param {number} audioFeatures.danceability - Danceability (0-1)
     * @param {number} audioFeatures.instrumentalness - Instrumentalness (0-1)
     * @param {number} audioFeatures.loudness - Loudness in dB
     * @param {number} audioFeatures.mode - Major (1) or Minor (0)
     * @param {Object} metadata - Album metadata for confidence adjustment
     * @param {number} metadata.trackCount - Number of tracks
     * @param {number} metadata.popularity - Spotify popularity (0-100)
     *
     * @returns {EmotionalVector} 7D emotional embedding
     *
     * @example
     * const embedding = this.computeEmbeddingFromAudioFeatures(audioFeatures, metadata);
     * // Returns: { valence: 0.7, arousal: 0.6, warmth: 0.5, ... }
     */
    computeEmbeddingFromAudioFeatures(audioFeatures, metadata) {
        // ─────────────────────────────────────────────────────────────────────
        // PSYCHOLOGICAL CORE (VAD-based, direct mappings)
        // ─────────────────────────────────────────────────────────────────────
        // Valence: direct mapping from Spotify (already validated)
        const valence = audioFeatures.valence ?? 0.5;
        // Arousal: map from energy (strong correlation with psychological arousal)
        const arousal = audioFeatures.energy ?? 0.5;
        // Tension: combine harmonic (mode) + dynamic (energy variance) indicators
        // Minor mode (0) = tense, Major mode (1) = resolved
        // More energy → potentially more tense
        const modeResolution = audioFeatures.mode ?? 0.5; // 1 = major (resolved), 0 = minor (tense)
        const tension = (1 - modeResolution) * 0.6 + (audioFeatures.energy * 0.3);
        // ─────────────────────────────────────────────────────────────────────
        // ATMOSPHERIC LAYER (music-specific, composite mappings)
        // ─────────────────────────────────────────────────────────────────────
        // Warmth: acoustic + human presence
        // Acoustic instruments = warm, synthetic = cold
        // More presence (less instrumentalness) = warmer
        const acousticness = audioFeatures.acousticness ?? 0.5;
        const instrumentalness = audioFeatures.instrumentalness ?? 0.5;
        const warmth = (acousticness * 0.6) + ((1 - instrumentalness) * 0.4);
        // Intimacy: acoustic + dynamic restraint
        // Acoustic + quiet = intimate, loud + synthetic = distant
        const loudnessNormalized = this.normalizeLoudness(audioFeatures.loudness);
        const intimacy = (acousticness * 0.7) + ((1 - loudnessNormalized) * 0.3);
        // Density: inverse acousticness + energy + loudness
        // Acoustic/sparse = low density, electronic/loud = high density
        const density = ((1 - acousticness) * 0.4) + (arousal * 0.3) + (loudnessNormalized * 0.3);
        // Spaciousness: acousticness (natural reverb) + low loudness
        // Acoustic instruments in open space = spacious
        // Compressed electronic = dense/claustrophobic
        // NOTE: Now part of density/groundedness - not separate dimension
        // Groundedness: inverse of spaciousness + electronic-ness
        // Grounded = acoustic/dense, escapist = sparse/electronic
        // Based on acousticness and density
        const groundedness = (acousticness * 0.6) + ((1 - density) * 0.4);
        // ─────────────────────────────────────────────────────────────────────
        // FOUNDATION DIMENSIONS (7D only for new system)
        // ─────────────────────────────────────────────────────────────────────
        // All 7 core dimensions calculated above
        return {
            valence,
            arousal,
            tension,
            warmth,
            intimacy,
            density,
            groundedness
        };
    }
    /**
     * Compute confidence score for an embedding
     *
     * Higher for:
     * - Well-known albums (more listener data, more stability)
     * - Albums with many tracks (more audio data to average)
     * - Recent albums (more accurate metadata)
     *
     * Lower for:
     * - Niche/indie albums (less validation)
     * - Single-track releases
     * - Very old albums (less reliable metadata)
     *
     * @private
     * @param {Object} metadata - Album metadata
     * @param {number} metadata.popularity - Spotify popularity 0-100
     * @param {number} metadata.trackCount - Number of tracks
     * @param {Date} metadata.releaseDate - Release date
     *
     * @returns {number} Confidence score 0-1
     */
    computeConfidence(metadata) {
        let confidence = 0.5; // base confidence
        // Popularity boosts confidence
        const popularity = metadata.popularity ?? 50;
        confidence += (popularity / 100) * 0.3; // up to +0.3
        // More tracks = more data to average = higher confidence
        const trackCount = metadata.trackCount ?? 1;
        const trackBoost = Math.min(trackCount / 20, 1) * 0.15; // up to +0.15
        confidence += trackBoost;
        // Recent albums more reliable
        if (metadata.releaseDate) {
            const ageInYears = (Date.now() - metadata.releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
            const recentBoost = Math.max(0, (1 - ageInYears / 30) * 0.1); // up to +0.1
            confidence += recentBoost;
        }
        return Math.min(confidence, 1);
    }
    /**
     * Normalize loudness from dB scale to 0-1
     *
     * Spotify loudness ranges roughly -60 to 0 dB
     * Maps to 0-1 where 0 = quiet, 1 = loud
     *
     * @private
     * @param {number} loudnessDb - Loudness in dB
     * @returns {number} Normalized loudness 0-1
     */
    normalizeLoudness(loudnessDb) {
        const MIN_DB = -60;
        const MAX_DB = 0;
        return Math.max(0, Math.min(1, (loudnessDb - MIN_DB) / (MAX_DB - MIN_DB)));
    }
    /**
     * Enrich album embedding with Last.fm tags
     *
     * ON-DEMAND enrichment:
     * 1. Fetch tags from Last.fm (album, fallback to artist)
     * 2. Blend base embedding with tag influences
     * 3. Return enriched embedding + status
     *
     * If Last.fm fails:
     * - Return base embedding unchanged
     * - Mark as "audio-only" (can be re-enriched later)
     * - Log error but don't throw (graceful degradation)
     *
     * @private
     * @async
     * @param {string} spotifyAlbumId - Spotify album ID
     * @param {string} albumName - Album name (for Last.fm lookup)
     * @param {string} artist - Artist name (for Last.fm lookup)
     * @param {Vector13D} baseEmbedding - Base embedding from audio features
     *
     * @returns {Promise<{ embedding: Vector13D; tags: ParsedLastfmTag[]; enrichmentStatus: string }>}
     *
     * @deprecated Use createEmbeddingFromLastfm() instead for Last.fm-only approach
     */
    async enrichWithLastfm(spotifyAlbumId, albumName, artist, baseEmbedding) {
        try {
            console.log(`[EMBEDDING] Starting Last.fm enrichment for "${albumName}" by ${artist}`);
            // STEP 1: Try to fetch album tags
            let tags = await lastfm_client_1.lastfmClient.fetchAlbumTags(artist, albumName);
            // STEP 2: Fallback to artist tags if album not found
            if (tags.length === 0) {
                console.log(`[EMBEDDING] No album tags found, trying artist tags...`);
                tags = await lastfm_client_1.lastfmClient.fetchArtistTags(artist);
            }
            // STEP 3: If we got tags, enrich; otherwise return base
            if (tags.length > 0) {
                console.log(`[EMBEDDING] Got ${tags.length} tags, enriching embedding...`);
                const enrichmentResult = await album_enrichment_service_1.albumEnrichmentService.enrichEmbedding(baseEmbedding, tags);
                return {
                    embedding: enrichmentResult.embedding,
                    tags: tags,
                    enrichmentStatus: enrichmentResult.enrichmentStatus
                };
            }
            else {
                console.log(`[EMBEDDING] No tags available, using base embedding`);
                return {
                    embedding: baseEmbedding,
                    tags: [],
                    enrichmentStatus: "audio-only"
                };
            }
        }
        catch (error) {
            console.error(`[EMBEDDING] Last.fm enrichment failed: ${error.message}`);
            console.log(`[EMBEDDING] Falling back to base embedding`);
            return {
                embedding: baseEmbedding,
                tags: [],
                enrichmentStatus: "audio-only"
            };
        }
    }
    /**
     * CREATE EMBEDDING FROM LAST.FM TAGS ONLY
     *
     * NEW APPROACH: Generate album embeddings using ONLY Last.fm community tags.
     * No Spotify audio features used.
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
        console.log(`[EMBEDDING] Creating Last.fm-only embedding for "${albumName}" by ${artist}`);
        try {
            // STEP 1: Fetch album tags
            let tags = await lastfm_client_1.lastfmClient.fetchAlbumTags(artist, albumName);
            // STEP 2: Fallback to artist tags if album not found
            if (tags.length === 0) {
                console.log(`[EMBEDDING] Album not found in Last.fm, trying artist...`);
                tags = await lastfm_client_1.lastfmClient.fetchArtistTags(artist);
            }
            // STEP 3: If we got tags, use signal fusion to create embedding
            if (tags.length > 0) {
                console.log(`[EMBEDDING] Got ${tags.length} tags, using signal fusion...`);
                // Classify tags into emotional, genre, metadata, other
                const classified = tag_classifier_service_1.tagClassifierService.classify(tags);
                console.log(`[EMBEDDING] Classified tags: ${classified.metrics.emotionalCount} emotional, ${classified.metrics.genreCount} genre, ${classified.metrics.metadataCount} metadata`);
                // Extract tag strings for signal fusion
                const emotionalTags = classified.emotional;
                const genreTags = classified.genre;
                console.log(`[EMBEDDING] Calling signal fusion with emotional=${emotionalTags.length}, genre=${genreTags.length}, artist=${artist}`);
                // STEP 4: Fuse all signals (emotional + genre + artist + global)
                const fusionResult = await signal_fusion_service_1.signalFusionService.fuseSignals({
                    emotionalTags,
                    genreTags,
                    artistName: artist
                });
                console.log(`[EMBEDDING] Signal fusion complete: confidence=${fusionResult.confidence.toFixed(2)}`);
                console.log(`[EMBEDDING] Signal breakdown:`, {
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
                console.log(`[EMBEDDING] No Last.fm tags found - cannot create embedding without data`);
                return {
                    embedding: null,
                    tags: [],
                    enrichmentStatus: "no-data",
                    confidence: 0.0
                };
            }
        }
        catch (error) {
            console.error(`[EMBEDDING] Last.fm-only creation failed: ${error.message}`);
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
     * STRATEGY:
     * 1. Check if embedding exists in cache → return
     * 2. If not → compute from audio features
     * 3. Store in database
     * 4. Return
     *
     * @async
     * @param {string} spotifyAlbumId - Spotify album ID
     * @param {Object} audioFeatures - Spotify audio features
     * @param {Object} metadata - Album metadata
     *
     * @returns {Promise<AlbumEmbedding>} 13D album embedding
     *
     * @throws {Error} If audio features invalid or computation fails
     *
     * @example
     * const embedding = await embeddingService.getOrComputeEmbedding(
     *   "spotify-id",
     *   audioFeatures,
     *   { albumName, artist, imageUrl, trackCount, popularity }
     * );
     */
    async getOrComputeEmbedding(spotifyAlbumId, audioFeatures, metadata) {
        const albumLabel = `"${metadata?.albumName}" by ${metadata?.artist}` || spotifyAlbumId;
        // Try to fetch cached embedding from database
        console.log(`[EMBEDDING] Checking database cache for ${albumLabel}...`);
        let cached = null;
        if (spotifyAlbumId) {
            // Only query cache if we have a valid spotifyAlbumId
            cached = await prisma.albumEmotionalEmbedding.findUnique({
                where: { spotifyAlbumId },
            });
        }
        else {
            console.log(`[EMBEDDING] No spotifyAlbumId provided - skipping cache lookup`);
        }
        if (cached) {
            console.log(`[EMBEDDING] ✓ CACHE HIT for ${albumLabel}`);
            console.log(`[EMBEDDING]   Status: ${cached.enrichmentStatus}, Confidence: ${cached.confidence.toFixed(2)}`);
            return this.prismaToEmbedding(cached);
        }
        if (spotifyAlbumId) {
            console.log(`[EMBEDDING] ✗ CACHE MISS for ${albumLabel} - RECOMPUTING from Last.fm`);
        }
        else {
            console.log(`[EMBEDDING] No spotifyAlbumId - computing from Last.fm for ${albumLabel}`);
        }
        // ═════════════════════════════════════════════════════════════════════════
        // NEW APPROACH: LAST.FM ONLY (no Spotify audio features)
        // ═════════════════════════════════════════════════════════════════════════
        // If Last.fm has data → use it
        // If Last.fm fails → mark as "no-data", don't create fake Spotify embedding
        // ═════════════════════════════════════════════════════════════════════════
        let embedmentResult;
        if (metadata?.albumName && metadata?.artist) {
            // Try Last.fm-only approach first
            embedmentResult = await this.createEmbeddingFromLastfm(metadata.albumName, metadata.artist);
        }
        else {
            console.log(`[EMBEDDING] No album metadata available - cannot create embedding`);
            embedmentResult = {
                embedding: null,
                tags: [],
                enrichmentStatus: "no-metadata",
                confidence: 0.0
            };
        }
        // If Last.fm failed or returned no data, DON'T fallback to Spotify
        // Instead, create a default neutral embedding to mark as "pending Last.fm"
        if (!embedmentResult.embedding) {
            console.log(`[EMBEDDING] ⚠️  Last.fm returned no data (status: ${embedmentResult.enrichmentStatus})`);
            // Create placeholder with default embedding
            embedmentResult.embedding = this.createDefaultEmbedding();
        }
        console.log(`[EMBEDDING] Final status: ${embedmentResult.enrichmentStatus}`);
        // STEP 2: Store in database ONLY if we have spotifyAlbumId
        // Last.fm-only candidates without Spotify IDs won't be cached, but we still return the embedding
        if (!spotifyAlbumId) {
            console.log(`[EMBEDDING] ⚠️  No spotifyAlbumId - not caching embedding for ${albumLabel}`);
            console.log(`[EMBEDDING]   (Last.fm-only candidate - will be recomputed next time)`);
            // Return computed embedding without storing (temporary object with minimal fields)
            const now = new Date();
            return {
                spotifyAlbumId: "", // Empty since not stored
                valence: embedmentResult.embedding.valence,
                arousal: embedmentResult.embedding.arousal,
                tension: embedmentResult.embedding.tension,
                warmth: embedmentResult.embedding.warmth,
                intimacy: embedmentResult.embedding.intimacy,
                density: embedmentResult.embedding.density,
                groundedness: embedmentResult.embedding.groundedness,
                derivedFrom: "lastfm",
                confidence: embedmentResult.confidence || 0.5,
                createdAt: now,
                updatedAt: now,
                albumName: metadata?.albumName,
                artist: metadata?.artist,
                imageUrl: metadata?.imageUrl,
                spotifyUrl: metadata?.spotifyUrl,
                enrichmentStatus: embedmentResult.enrichmentStatus,
                tags: embedmentResult.tags && embedmentResult.tags.length > 0 ? embedmentResult.tags : undefined
            };
        }
        // STEP 2B: Store in database (write all 7D fields + deprecated fields for schema compatibility)
        console.log(`[EMBEDDING] Storing embedding in database for ${albumLabel}...`);
        const embedding = await prisma.albumEmotionalEmbedding.create({
            data: {
                spotifyAlbumId,
                valence: embedmentResult.embedding.valence,
                arousal: embedmentResult.embedding.arousal,
                tension: embedmentResult.embedding.tension,
                warmth: embedmentResult.embedding.warmth,
                intimacy: embedmentResult.embedding.intimacy,
                density: embedmentResult.embedding.density,
                groundedness: embedmentResult.embedding.groundedness,
                // DEPRECATED FIELDS: Set to 0.5 (neutral) for backward compatibility with schema
                spaciousness: 0.5,
                organicSynthetic: 0.5,
                nostalgia: 0.5,
                introspection: 0.5,
                movement: 0.5,
                derivedFrom: "lastfm", // Changed from "audioFeatures"
                confidence: embedmentResult.confidence || 0.5, // Use confidence from signal fusion
                albumName: metadata?.albumName,
                artist: metadata?.artist,
                imageUrl: metadata?.imageUrl,
                spotifyUrl: metadata?.spotifyUrl,
                tags: embedmentResult.tags && embedmentResult.tags.length > 0 ? JSON.parse(JSON.stringify(embedmentResult.tags)) : undefined,
                enrichmentStatus: embedmentResult.enrichmentStatus,
            },
        });
        console.log(`[EMBEDDING] ✓ STORED ${albumLabel}`);
        console.log(`[EMBEDDING]   Status: ${embedding.enrichmentStatus}, Confidence: ${embedding.confidence.toFixed(2)}`);
        console.log(`[EMBEDDING]   Embedding: v=${embedding.valence.toFixed(2)} a=${embedding.arousal.toFixed(2)} t=${embedding.tension.toFixed(2)} w=${embedding.warmth.toFixed(2)} i=${embedding.intimacy.toFixed(2)} d=${embedding.density.toFixed(2)} g=${embedding.groundedness.toFixed(2)}`);
        return this.prismaToEmbedding(embedding);
    }
    /**
     * Get embedding for an album (must exist)
     *
     * @async
     * @param {string} spotifyAlbumId - Spotify album ID
     *
     * @returns {Promise<AlbumEmbedding|null>} Embedding or null if not found
     *
     * @throws {Error} On database errors
     */
    async getEmbedding(spotifyAlbumId) {
        const embedding = await prisma.albumEmotionalEmbedding.findUnique({
            where: { spotifyAlbumId },
        });
        return embedding ? this.prismaToEmbedding(embedding) : null;
    }
    /**
     * Convert Prisma model to API representation
     *
     * @private
     * @param {AlbumEmotionalEmbedding} prismaModel - Prisma model
     * @returns {AlbumEmbedding} API representation
     */
    prismaToEmbedding(prismaModel) {
        return {
            spotifyAlbumId: prismaModel.spotifyAlbumId,
            valence: prismaModel.valence,
            arousal: prismaModel.arousal,
            tension: prismaModel.tension,
            warmth: prismaModel.warmth,
            intimacy: prismaModel.intimacy,
            density: prismaModel.density,
            groundedness: prismaModel.groundedness,
            albumName: prismaModel.albumName ?? undefined,
            artist: prismaModel.artist ?? undefined,
            imageUrl: prismaModel.imageUrl ?? undefined,
            spotifyUrl: prismaModel.spotifyUrl ?? undefined,
            derivedFrom: prismaModel.derivedFrom,
            confidence: prismaModel.confidence,
            tags: prismaModel.tags ?? undefined,
            enrichmentStatus: prismaModel.enrichmentStatus ?? undefined,
            createdAt: prismaModel.createdAt,
            updatedAt: prismaModel.updatedAt,
        };
    }
}
exports.albumEmbeddingService = new AlbumEmbeddingService();
