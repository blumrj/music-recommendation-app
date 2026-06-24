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
 * Adds exploratory albums to candidate pools to prevent recommendation feedback loops.
 */
class ExplorationService {
    constructor() {
        /**
         * Diverse tags for exploratory discovery
         */
        this.EMOTIONAL_TAGS = [
            "dream pop", "shoegaze", "ethereal", "dreamy", "ambient",
            "slowcore", "sad", "melancholic", "introspective", "intimate",
            "folk", "acoustic", "singer-songwriter", "indie folk", "organic",
            "post-rock", "experimental", "art rock", "alternative", "dynamic",
            "lo-fi", "electroacoustic", "synth", "minimal", "experimental electronic"
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
}
exports.explorationService = new ExplorationService();
//# sourceMappingURL=exploration.service.js.map