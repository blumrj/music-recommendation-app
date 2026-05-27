"use strict";
/**
 * SEMANTIC SIMILARITY SERVICE
 *
 * Computes semantic similarity between Last.fm tags and emotional dimensions.
 *
 * CORE IDEA:
 * - For any Last.fm tag, compute similarity to all 7 emotional dimensions
 * - Use FastText embeddings + cosine similarity
 * - Result: tag is positioned in 7D emotional space (soft scores, no thresholds)
 *
 * ALGORITHM:
 * 1. Embed Last.fm tag word via FastText
 * 2. For each emotional dimension name:
 *    - Embed dimension name via FastText
 *    - Compute cosine similarity
 * 3. Return all 12 similarity scores
 *
 * @category Services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticSimilarityService = void 0;
const fasttext_embedding_service_1 = require("./fasttext-embedding.service");
const emotional_dimensions_1 = require("../config/emotional-dimensions");
/**
 * Semantic Similarity Service
 * Computes tag ↔ dimension similarities via word embeddings
 */
class SemanticSimilarityService {
    constructor() {
        this.dimensionEmbeddings = new Map();
        this.tagSimilarityCache = new Map();
        // Pre-compute embeddings for all dimension names (fast, done once)
        this.precomputeDimensionEmbeddings();
        console.log(`[SEMANTIC] Service initialized with ${(0, emotional_dimensions_1.getDimensionNames)().length} dimensions`);
    }
    /**
     * Pre-compute and cache embeddings for all emotional dimension names
     *
     * This is done once at service initialization so we don't re-embed
     * "warmth", "intimacy", "density", etc. repeatedly.
     *
     * @private
     */
    precomputeDimensionEmbeddings() {
        const dimensions = (0, emotional_dimensions_1.getDimensionNames)();
        for (const dim of dimensions) {
            const embedding = fasttext_embedding_service_1.fastTextService.embedWord(dim);
            this.dimensionEmbeddings.set(dim, embedding);
        }
        console.log(`[SEMANTIC] Pre-computed embeddings for ${dimensions.length} dimensions`);
    }
    /**
     * Compute semantic similarity scores for a tag across all 7 emotional dimensions
     *
     * ALGORITHM:
     * 1. Embed the tag word via FastText
     * 2. For each dimension:
     *    - Get pre-computed dimension embedding
     *    - Compute cosine similarity
     * 3. Return sparse scores (keep only top 1-2 dimensions)
     *
     * RESULT EXAMPLE:
     * Input: "ethereal"
     * Output: {
     *   valence: 0.4,
     *   arousal: 0.2,
     *   groundedness: 0.1,
     *   ...
     * }
     *
     * @param tag - Last.fm tag (e.g., "ethereal", "lush", "energetic")
     * @returns Record mapping each dimension name to similarity score [0, 1]
     */
    computeTagDimensionSimilarities(tag) {
        const normalizedTag = tag.toLowerCase().trim();
        // Check cache
        if (this.tagSimilarityCache.has(normalizedTag)) {
            return this.tagSimilarityCache.get(normalizedTag);
        }
        // Embed the tag
        let tagEmbedding;
        try {
            tagEmbedding = fasttext_embedding_service_1.fastTextService.embedWord(normalizedTag);
        }
        catch (error) {
            console.warn(`[SEMANTIC] Failed to embed tag "${normalizedTag}":`, error);
            return {}; // Return empty on error (graceful degradation)
        }
        // PHASE 1: Compute similarities to all dimensions
        const allSimilarities = {};
        const dimensions = (0, emotional_dimensions_1.getDimensionNames)();
        for (const dim of dimensions) {
            const dimEmbedding = this.dimensionEmbeddings.get(dim);
            if (!dimEmbedding) {
                console.warn(`[SEMANTIC] Missing embedding for dimension "${dim}"`);
                allSimilarities[dim] = 0.5; // Neutral
                continue;
            }
            try {
                const similarity = fasttext_embedding_service_1.fastTextService.cosineSimilarity(tagEmbedding, dimEmbedding);
                allSimilarities[dim] = similarity;
            }
            catch (error) {
                console.warn(`[SEMANTIC] Failed to compute similarity for "${dim}":`, error);
                allSimilarities[dim] = 0.5; // Neutral fallback
            }
        }
        // PHASE 2: SPARSIFICATION
        // Keep ONLY TOP dimension with VERY STRONG confidence (0.70+)
        // This forces maximal sparsity - each tag influences only its single strongest dimension
        //
        // Example:
        // Input:  { valence: 0.35, arousal: 0.2, groundedness: 0.82, density: 0.15, ... }
        // Result: { groundedness: 0.82 } (only if it's clear winner, 2nd place ignored unless 0.70+)
        const sortedDims = Object.entries(allSimilarities)
            .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
        const similarities = {};
        // Increased from 0.60 to 0.70 for EXTREME semantic sparsity
        // Each tag now influences only its primary dimension
        const SPARSIFICATION_THRESHOLD = 0.70;
        // Always keep top dimension (even if below threshold, it's the strongest)
        if (sortedDims.length > 0 && sortedDims[0][1] !== undefined) {
            similarities[sortedDims[0][0]] = sortedDims[0][1];
        }
        // Keep second dimension only if CLEARLY above threshold (strict sparsification)
        if (sortedDims.length > 1 && sortedDims[1][1] !== undefined && sortedDims[1][1] > SPARSIFICATION_THRESHOLD) {
            similarities[sortedDims[1][0]] = sortedDims[1][1];
        }
        // All other dimensions left undefined (sparse representation)
        // This ensures each tag strongly influences only 1-2 most relevant dimensions
        // Weak similarities are discarded, preventing semantic leakage
        // Cache for future use
        this.tagSimilarityCache.set(normalizedTag, similarities);
        // Log sparsified interpretation
        const sparseEntriesLog = Object.entries(similarities)
            .map(([dim, score]) => `${dim}: ${(score ?? 0).toFixed(2)}`)
            .join(", ");
        console.log(`[SEMANTIC] "${normalizedTag}" → SPARSE {${sparseEntriesLog}} (${Object.keys(similarities).length} dims used)`);
        console.log(`[SEMANTIC]   Full scores were: ${Object.entries(allSimilarities).slice(0, 3).map(([d, s]) => `${d}: ${s.toFixed(2)}`).join(", ")}`);
        return similarities;
    }
    /**
     * Get cache statistics (for debugging)
     */
    getCacheStats() {
        return {
            tagCache: this.tagSimilarityCache.size,
            dimensionCache: this.dimensionEmbeddings.size
        };
    }
    /**
     * Clear tag cache (if needed for memory management)
     */
    clearTagCache() {
        this.tagSimilarityCache.clear();
        console.log(`[SEMANTIC] Tag cache cleared`);
    }
}
// Export singleton instance
exports.semanticSimilarityService = new SemanticSimilarityService();
