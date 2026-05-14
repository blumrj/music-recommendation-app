"use strict";
/**
 * EXPLORATION SERVICE
 *
 * Adds controlled randomness to candidate pools for serendipitous discovery.
 *
 * CORE PHILOSOPHY:
 * Without exploration pressure, recommendations collapse into sameness.
 *
 * STRATEGY:
 * - 80% emotionally close candidates (from Last.fm expansion)
 * - 20% exploratory albums (random tags, trending, diverse genres)
 *
 * This prevents feedback loops while maintaining emotional coherence.
 *
 * @category Services
 * @module services/exploration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.explorationService = void 0;
const lastfm_discovery_service_1 = require("./lastfm-discovery.service");
/**
 * Exploration Service
 *
 * Manages discovery serendipity and exploration pressure.
 *
 * @class ExplorationService
 */
class ExplorationService {
    constructor() {
        /**
         * Emotional tags for exploratory discovery
         *
         * These represent emotionally-distinct subgenres.
         * Used to guide exploration without breaking coherence.
         */
        this.EMOTIONAL_TAGS = [
            // Dream-based
            "dream pop",
            "shoegaze",
            "ethereal",
            "dreamy",
            "ambient",
            // Introspective
            "slowcore",
            "sad",
            "melancholic",
            "introspective",
            "intimate",
            // Organic
            "folk",
            "acoustic",
            "singer-songwriter",
            "indie folk",
            "organic",
            // Energetic
            "post-rock",
            "experimental",
            "art rock",
            "alternative",
            "dynamic",
            // Electronic adjacent
            "lo-fi",
            "electroacoustic",
            "synth",
            "minimal",
            "experimental electronic"
        ];
    }
    /**
     * Add exploratory albums to candidate pool
     *
     * Strategy:
     * - Use tailored exploration ratio (default 20%)
     * - Sample from random emotional tags
     * - Add trending albums (if available)
     * - Merge with main candidates
     *
     * @async
     * @param {AlbumCandidate[]} existingCandidates - Current candidate pool
     * @param {number} targetPoolSize - Desired final pool size
     * @param {number} explorationRatio - Fraction of pool for exploration (0-1)
     *
     * @returns {Promise<AlbumCandidate[]>} Pool with exploration candidates added
     *
     * @example
     * const candidates = await [...]; // 150 from Last.fm expansion
     * const withExploration = await service.addExploratoryAlbums(
     *   candidates,
     *   300,    // Target 300 total
     *   0.2     // 20% = 60 exploratory albums
     * );
     * // Returns: ~300 albums (150 expansion + 60 exploratory + padding)
     */
    async addExploratoryAlbums(existingCandidates, targetPoolSize, explorationRatio = 0.2) {
        console.log(`[EXPLORATION] Adding exploration albums (ratio: ${(explorationRatio * 100).toFixed(0)}%)...`);
        const exploratoryCount = Math.floor(targetPoolSize * explorationRatio);
        console.log(`[EXPLORATION] Target: ${targetPoolSize}, Exploratory: ${exploratoryCount}, From existing: ${existingCandidates.length}`);
        try {
            // Sample random tags for exploration
            const exploratoryTags = this.sampleRandomTags(Math.max(1, Math.floor(exploratoryCount / 20)) // ~20 albums per tag
            );
            console.log(`[EXPLORATION] Sampled ${exploratoryTags.length} random tags: ${exploratoryTags.join(", ")}`);
            // Get albums from random tags
            const exploratory = await lastfm_discovery_service_1.lastfmDiscoveryService.expandByTags(exploratoryTags, Math.ceil(exploratoryCount / exploratoryTags.length));
            console.log(`[EXPLORATION] Got ${exploratory.length} exploratory candidates from tags`);
            // Merge: existing candidates + exploratory
            const merged = [
                ...existingCandidates,
                ...exploratory
            ];
            // Deduplicate
            const deduplicated = this.deduplicateCandidates(merged);
            console.log(`[EXPLORATION] ✓ Pool after exploration: ${deduplicated.length} albums`);
            return deduplicated;
        }
        catch (error) {
            console.warn(`[EXPLORATION] Error adding exploratory albums:`, error.message);
            console.log(`[EXPLORATION] Falling back to existing candidates only`);
            return existingCandidates;
        }
    }
    /**
     * Sample random tags from emotional tag list
     *
     * @private
     * @param {number} count - How many tags to sample
     *
     * @returns {string[]} Random emotional tags
     */
    sampleRandomTags(count) {
        const sampled = [];
        const shuffled = [...this.EMOTIONAL_TAGS].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            sampled.push(shuffled[i]);
        }
        return sampled;
    }
    /**
     * Deduplicate album candidates
     *
     * @private
     * @param {AlbumCandidate[]} albums - Albums to deduplicate
     *
     * @returns {AlbumCandidate[]} Deduplicated albums
     */
    deduplicateCandidates(albums) {
        const seen = new Set();
        const deduplicated = [];
        for (const album of albums) {
            const key = `${album.albumName.toLowerCase()}|${album.artist.toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(album);
            }
        }
        return deduplicated;
    }
    /**
     * Apply controlled randomness within emotional boundaries
     *
     * FUTURE: For Phase 2, this could implement:
     * - Albums slightly outside emotional similarity threshold
     * - "Bridge" albums to emotionally adjacent genres
     * - Controlled genre expansion
     *
     * @param {AlbumCandidate[]} candidates - Candidates to add noise to
     * @param {number} noiseLevel - How much randomness to add (0-1)
     *
     * @returns {AlbumCandidate[]} Candidates with noise applied
     *
     * @note Phase 2+ feature - currently not used
     */
    controlledRandomness(candidates, noiseLevel) {
        // TODO: Phase 2 feature
        // For now, just return as-is
        return candidates;
    }
    /**
     * Get emotional tags for exploration
     *
     * Useful for UI or debugging.
     *
     * @returns {string[]} All available emotional tags
     */
    getEmotionalTags() {
        return [...this.EMOTIONAL_TAGS];
    }
    /**
     * Calculate exploration ratio given pool size
     *
     * For Phase 2: adaptive exploration based on pool quality.
     *
     * @param {number} candidatePoolSize - Current pool size
     * @param {number} targetPoolSize - Desired pool size
     *
     * @returns {number} Recommended exploration ratio (0-1)
     *
     * @note Phase 2+ feature
     */
    getAdaptiveExplorationRatio(candidatePoolSize, targetPoolSize) {
        // Simple strategy: explore more if pool is small
        // Small pool (sparse exploration space) → explore more
        // Large pool (rich candidates) → explore less
        const fillRatio = candidatePoolSize / targetPoolSize;
        if (fillRatio < 0.5)
            return 0.3; // Sparse: 30% exploration
        if (fillRatio < 0.8)
            return 0.25; // Moderate: 25% exploration
        return 0.2; // Rich: 20% exploration
    }
}
exports.explorationService = new ExplorationService();
