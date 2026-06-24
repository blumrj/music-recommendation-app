"use strict";
/**
 * SIGNAL FUSION SERVICE
 *
 * Orchestrates the probabilistic fusion of 4 signal sources into a single 13D embedding.
 *
 * SIGNALS:
 * 1. Emotional tags (FastText semantic similarity) - highest priority
 * 2. Genre tags (soft emotional priors) - medium priority
 * 3. Artist embeddings (aggregated from artist's albums) - stabilizing signal
 * 4. Global prior (average across all albums) - baseline fallback
 *
 * PHILOSOPHY:
 * - All signals computed in parallel (not sequentially)
 * - Weighted blending (emotional dominant, but others always contribute)
 * - Adaptive weights based on signal availability
 * - Confidence = sum of available signal strengths
 * - Always returns valid embedding, never null
 *
 * @category Services
 * @module services/signal-fusion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalFusionService = void 0;
const tag_embedding_service_1 = require("./tag-embedding.service");
const artist_embedding_service_1 = require("./artist-embedding.service");
const emotional_dimensions_1 = require("../../config/emotional-dimensions");
const genre_priors_1 = require("../../config/genre-priors");
const vector_1 = require("../../shared/math/vector");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Signal Fusion Service
 *
 * Blends multiple embedding sources with adaptive weighting
 */
class SignalFusionService {
    constructor() {
        this.globalPrior = null;
        this.globalPriorTimestamp = 0;
        this.GLOBAL_PRIOR_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
        // Initialize global prior on first use
        this.initializeGlobalPrior();
    }
    /**
     * Initialize global prior from database
     *
     * Computes average embedding across all albums (cached for 24 hours)
     *
     * @private
     * @async
     */
    async initializeGlobalPrior() {
        try {
            // Fetch all album intrinsic dimensions
            const allDimensions = await prisma.albumIntrinsicProfileDimension.findMany({
                include: { dimension: true }
            });
            if (allDimensions.length === 0) {
                // No albums with embeddings yet, use neutral
                this.globalPrior = this.getNeutralEmbedding();
                this.globalPriorTimestamp = Date.now();
                console.log(`[SIGNAL-FUSION] Global prior initialized (no albums with embeddings yet)`);
                return;
            }
            // Group by dimension and compute averages
            const dimensionValues = {};
            for (const dimData of allDimensions) {
                if (!dimensionValues[dimData.dimension.name]) {
                    dimensionValues[dimData.dimension.name] = [];
                }
                dimensionValues[dimData.dimension.name].push(dimData.value);
            }
            // Build global prior as average across all dimensions
            const prior = {
                valence: 0.5,
                arousal: 0.5,
                tension: 0.5,
                warmth: 0.5,
                intimacy: 0.5,
                density: 0.5,
                groundedness: 0.5
            };
            for (const [dimensionName, values] of Object.entries(dimensionValues)) {
                if (values.length > 0) {
                    const average = values.reduce((a, b) => a + b, 0) / values.length;
                    prior[dimensionName] = average;
                }
            }
            this.globalPrior = prior;
            this.globalPriorTimestamp = Date.now();
            console.log(`[SIGNAL-FUSION] Global prior initialized from ${allDimensions.length} dimension records`);
        }
        catch (error) {
            console.error(`[SIGNAL-FUSION] Error initializing global prior:`, error.message);
            this.globalPrior = this.getNeutralEmbedding();
        }
    }
    /**
     * Get global prior, refreshing if needed (TTL-based cache)
     *
     * @private
     * @async
     */
    async getGlobalPrior() {
        if (!this.globalPrior) {
            await this.initializeGlobalPrior();
        }
        // Check if cache is expired
        const ageMs = Date.now() - this.globalPriorTimestamp;
        if (ageMs > this.GLOBAL_PRIOR_TTL_MS) {
            console.log(`[SIGNAL-FUSION] Global prior expired, refreshing...`);
            await this.initializeGlobalPrior();
        }
        return this.globalPrior || this.getNeutralEmbedding();
    }
    /**
     * Main entry point: fuse all signals for an album
     *
     * INPUT:
     * - emotionalTags: Classified emotional descriptors
     * - genreTags: Classified genre tags
     * - artistName: Album artist
     *
     * OUTPUT:
     * - embedding: Final 13D vector
     * - confidence: Quality score (0-1)
     * - signalBreakdown: Details on each signal's contribution
     *
     * @async
     * @param input - Input signals
     * @returns Fused embedding + confidence + breakdown
     */
    async fuseSignals(input) {
        console.log(`[SIGNAL-FUSION] Fusing signals for album (artist: ${input.artistName})`);
        // STEP 1: Compute all signals in parallel
        console.log(`[SIGNAL-FUSION]   - Computing emotional signal (${input.emotionalTags.length} tags)...`);
        console.log(`[SIGNAL-FUSION]   - Computing genre signal (${input.genreTags.length} tags)...`);
        console.log(`[SIGNAL-FUSION]   - Computing artist signal...`);
        console.log(`[SIGNAL-FUSION]   - Getting global prior...`);
        const [emotionalSignal, genreSignal, artistSignal, globalSignal] = await Promise.all([
            this.computeEmotionalSignal(input.emotionalTags),
            this.computeGenreSignal(input.genreTags),
            artist_embedding_service_1.artistEmbeddingService.getOrComputeArtistEmbedding(input.artistName),
            this.getGlobalPrior()
        ]);
        // STEP 2: Calculate signal presence weights (0-1 per signal)
        // MINIMAL AVERAGING: Artist and global signals dramatically reduced
        // Emotional + genre signals now nearly exclusive control
        const w_emotional = emotionalSignal.embedding ? 1.0 : 0.0;
        const w_genre = genreSignal.embedding ? 0.3 : 0.0;
        const w_artist = artistSignal?.embedding
            ? Math.min(0.08, (artistSignal.albumCount / 10) * 0.08) // REDUCED from 0.15 to 0.08
            : 0.0;
        const w_global = 0.02; // REDUCED from 0.05 to 0.02 (minimal centering pull)
        console.log(`[SIGNAL-FUSION]   Weights: emotional=${w_emotional}, genre=${w_genre}, artist=${w_artist.toFixed(2)}, global=${w_global}`);
        // STEP 3: Normalize weights
        const totalWeight = w_emotional + w_genre + w_artist + w_global;
        const w_e_norm = w_emotional / totalWeight;
        const w_g_norm = w_genre / totalWeight;
        const w_a_norm = w_artist / totalWeight;
        const w_gl_norm = w_global / totalWeight;
        console.log(`[SIGNAL-FUSION]   Normalized: emotional=${w_e_norm.toFixed(2)}, genre=${w_g_norm.toFixed(2)}, artist=${w_a_norm.toFixed(2)}, global=${w_gl_norm.toFixed(2)}`);
        // STEP 4: Blend embeddings (weighted average per dimension)
        const blended = this.blendEmbeddings(emotionalSignal.embedding, genreSignal.embedding, artistSignal?.embedding ?? null, globalSignal, w_e_norm, w_g_norm, w_a_norm, w_gl_norm);
        // STEP 4.5: Apply contrast sharpening
        // Push values away from 0.5 to increase emotional distinctiveness
        // and reduce embedding collapse
        const sharpened = (0, vector_1.sharpenContrast)(blended);
        // STEP 5: Calculate confidence (sum of available signal strengths)
        const confidence = this.calculateConfidence(w_emotional, w_genre, w_artist, w_global);
        console.log(`[SIGNAL-FUSION] ✓ Final confidence: ${confidence.toFixed(2)}`);
        const result = {
            embedding: sharpened,
            confidence,
            signalBreakdown: {
                emotional: {
                    weight: w_e_norm,
                    embedding: emotionalSignal.embedding,
                    confidence: emotionalSignal.confidence,
                    metadata: { tagCount: input.emotionalTags.length }
                },
                genre: {
                    weight: w_g_norm,
                    embedding: genreSignal.embedding,
                    confidence: genreSignal.confidence,
                    metadata: { tagCount: input.genreTags.length }
                },
                artist: {
                    weight: w_a_norm,
                    embedding: artistSignal?.embedding ?? null,
                    confidence: artistSignal?.confidence ?? 0,
                    metadata: { albumCount: artistSignal?.albumCount ?? 0 }
                },
                global: {
                    weight: w_gl_norm,
                    embedding: globalSignal,
                    confidence: 0.1
                }
            }
        };
        return result;
    }
    /**
     * Compute emotional signal from emotional tags
     *
     * Uses FastText semantic similarity to map tags to 7D
     *
     * @private
     * @async
     */
    async computeEmotionalSignal(emotionalTags) {
        if (emotionalTags.length === 0) {
            return { embedding: null, confidence: 0.0 };
        }
        try {
            // Convert to ParsedLastfmTag format
            const tags = emotionalTags.map((tag, idx) => ({
                tag,
                count: emotionalTags.length - idx // Weight by position (first tags have higher count)
            }));
            const embedding = await tag_embedding_service_1.tagEmbeddingService.mapTagsTo13D(tags);
            // Confidence: 0.8 + (emotionalTagCount / totalTags) × 0.2
            // But we only have emotional tags here, so use tag count relative to assumed total
            const confidence = 0.8 + Math.min(0.2, emotionalTags.length / 5 * 0.1);
            return {
                embedding: embedding,
                confidence: Math.min(1.0, confidence)
            };
        }
        catch (error) {
            console.error(`[SIGNAL-FUSION] Error computing emotional signal:`, error.message);
            return { embedding: null, confidence: 0.0 };
        }
    }
    /**
     * Compute genre signal from genre tags
     *
     * Blends genre priors weighted by frequency
     *
     * @private
     * @async
     */
    async computeGenreSignal(genreTags) {
        if (genreTags.length === 0) {
            return { embedding: null, confidence: 0.0 };
        }
        try {
            const accumulated = {};
            let foundGenres = 0;
            // For each genre tag, look up prior and accumulate
            for (const genre of genreTags) {
                const prior = (0, genre_priors_1.getGenrePrior)(genre);
                if (!prior) {
                    continue;
                }
                foundGenres++;
                // Accumulate deviations
                for (const [dim, deviation] of Object.entries(prior)) {
                    if (dim === "confidence")
                        continue;
                    if (!accumulated[dim]) {
                        accumulated[dim] = 0;
                    }
                    accumulated[dim] += (deviation ?? 0);
                }
            }
            if (foundGenres === 0) {
                return { embedding: null, confidence: 0.0 };
            }
            // Convert accumulated deviations to embedding (0.5 + deviation)
            const embedding = {};
            const dims = (0, emotional_dimensions_1.getDimensionNames)();
            for (const dim of dims) {
                // Average accumulated deviation
                const avgDeviation = (accumulated[dim] ?? 0) / genreTags.length;
                // Clamp to valid range
                embedding[dim] = Math.max(0, Math.min(1, 0.5 + avgDeviation));
            }
            // Confidence: 0.4 + (genreTagCount / totalTags) × 0.15
            // Assume total tags = genre + some metadata
            const confidence = 0.4 + Math.min(0.15, foundGenres / 10 * 0.1);
            return {
                embedding: embedding,
                confidence: Math.min(1.0, confidence)
            };
        }
        catch (error) {
            console.error(`[SIGNAL-FUSION] Error computing genre signal:`, error.message);
            return { embedding: null, confidence: 0.0 };
        }
    }
    /**
     * Blend embeddings with adaptive weights
     *
     * For each dimension: weighted average of available signals
     *
     * @private
     */
    blendEmbeddings(emotional, genre, artist, global, w_e, w_g, w_a, w_gl) {
        const blended = {};
        const dims = (0, emotional_dimensions_1.getDimensionNames)();
        for (const dim of dims) {
            const dimKey = dim;
            // Get values, but track which signals actually have a value (not undefined)
            const e_val = emotional?.[dimKey];
            const g_val = genre?.[dimKey];
            const a_val = artist?.[dimKey];
            const gl_val = global[dimKey] ?? 0.5;
            // For sparse embeddings: only blend signals that have actual values
            // Missing dimensions in sparse embeddings should NOT use 0 - they should just skip that signal
            let totalWeight = 0;
            let weightedSum = 0;
            // Emotional signal (only if value exists)
            if (e_val !== undefined) {
                weightedSum += e_val * w_e;
                totalWeight += w_e;
            }
            // Genre signal (only if value exists)
            if (g_val !== undefined) {
                weightedSum += g_val * w_g;
                totalWeight += w_g;
            }
            // Artist signal (only if value exists)
            if (a_val !== undefined) {
                weightedSum += a_val * w_a;
                totalWeight += w_a;
            }
            // Global prior (always present, always used)
            weightedSum += gl_val * w_gl;
            totalWeight += w_gl;
            // Final blend: weighted average of only present signals
            blended[dim] = weightedSum / totalWeight;
        }
        return blended;
    }
    /**
     * Calculate final confidence score
     *
     * Confidence = sum of available signal strengths
     * - Emotional: 0.8 if present
     * - Genre: 0.15 if present
     * - Artist: up to 0.2 depending on weight
     * - Global: 0.1 always
     *
     * @private
     */
    calculateConfidence(w_emotional, w_genre, w_artist, w_global) {
        let confidence = 0.0;
        if (w_emotional > 0)
            confidence += 0.8; // Emotional tags = high
        if (w_genre > 0)
            confidence += 0.15; // Genre = medium
        if (w_artist > 0)
            confidence += Math.min(0.2, w_artist); // Artist = up to 0.2
        if (w_global > 0)
            confidence += 0.1; // Global = baseline
        return Math.max(0.0, Math.min(1.0, confidence));
    }
    /**
     * Get neutral 7D embedding (all 0.5)
     *
     * @private
     */
    getNeutralEmbedding() {
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
     * Manually refresh global prior
     * Useful if database has been updated with many new albums
     */
    async refreshGlobalPrior() {
        this.globalPrior = null;
        this.globalPriorTimestamp = 0;
        await this.initializeGlobalPrior();
    }
    /**
     * Apply aggressive contrast sharpening to maximize emotional distinctiveness
     *
     * PURPOSE:
     * - Eliminate embedding collapse completely
     * - Push ALL values away from neutral center aggressively
     * - Create maximally distinct emotional profiles
     *
     * ALGORITHM:
     * - Values in [0.35, 0.65] range (neutral zone) pushed HARD toward extremes
     * - Values in [0.25, 0.75] range get mild push
     * - Only extremely polarized values (< 0.25 or > 0.75) stay unchanged
     * - Multi-tier sharpening for compounding effect
     *
     * EFFECT EXAMPLE:
     * Input:  [0.48, 0.52, 0.40, 0.55, 0.45, 0.50, 0.38]
     * Output: [0.30, 0.70, 0.20, 0.75, 0.28, 0.50, 0.18]
     * (Values pushed far from center; creates HIGH contrast)
     *
     * @private
     * @param embedding - Blended 7D embedding to sharpen
     * @returns Sharpened embedding with aggressive increased contrast
     */
    sharpenContrast(embedding) {
        const sharpened = {};
        const dims = (0, emotional_dimensions_1.getDimensionNames)();
        // Aggressive sharpening parameters
        const NEUTRAL_ZONE_MIN = 0.35;
        const NEUTRAL_ZONE_MAX = 0.65;
        const SHARPENING_STRENGTH = 1.8; // INCREASED from 1.3 to 1.8 (80% amplification)
        for (const dim of dims) {
            const val = embedding[dim] ?? 0.5;
            // Apply aggressive sharpening to all values in/near neutral zone
            if (val >= NEUTRAL_ZONE_MIN && val <= NEUTRAL_ZONE_MAX) {
                // Strong push: values in [0.35, 0.65] → far from center
                const deviation = val - 0.5;
                const sharpenedDeviation = deviation * SHARPENING_STRENGTH;
                const sharpenedVal = 0.5 + sharpenedDeviation;
                sharpened[dim] = Math.max(0, Math.min(1, sharpenedVal));
            }
            else if (val > 0.25 && val < 0.75) {
                // Mild push for near-neutral values: [0.25-0.35] or [0.65-0.75]
                const deviation = val - 0.5;
                const sharpenedDeviation = deviation * 1.4; // 40% amplification for these
                const sharpenedVal = 0.5 + sharpenedDeviation;
                sharpened[dim] = Math.max(0, Math.min(1, sharpenedVal));
            }
            else {
                // Extremely polarized, keep unchanged
                sharpened[dim] = val;
            }
        }
        return sharpened;
    }
}
// Export singleton instance
exports.signalFusionService = new SignalFusionService();
//# sourceMappingURL=signal-fusion.service.js.map