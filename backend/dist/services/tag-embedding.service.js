"use strict";
/**
 * TAG EMBEDDING SERVICE
 *
 * Converts semantic tags (from Last.fm) into 13D emotional influence vectors.
 *
 * ARCHITECTURE CHANGE (Semantic Similarity):
 * - REPLACES hardcoded tag-mapping with FastText semantic similarity
 * - For any Last.fm tag, computes similarity to all 12 emotional dimensions
 * - No manual tag curation needed; handles unseen tags automatically
 *
 * RESPONSIBILITY:
 * - Map Last.fm tags to 13D using semantic similarity
 * - Accumulate influences from multiple tags (weighted by popularity)
 * - Normalize results to 0-1 range
 * - Log tag interpretations for transparency
 *
 * PHILOSOPHY:
 * - Tags are semantic signals, interpreted via word embeddings
 * - Multiple tags can influence same dimension
 * - Unknown tags handled gracefully via OOV in FastText
 *
 * @category Services
 * @module services/tag-embedding
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagEmbeddingService = void 0;
const semantic_similarity_service_1 = require("./semantic-similarity.service");
/**
 * Tag Embedding Service
 *
 * Converts Last.fm tags → 13D emotional influence vectors
 */
class TagEmbeddingService {
    /**
     * Map Last.fm tags to 13D emotional embedding via semantic similarity
     *
     * ALGORITHM (SEMANTIC SIMILARITY):
     * 1. For each tag, compute semantic similarity to all 12 dimensions
     * 2. Weight similarities by tag popularity (count)
     * 3. Accumulate weighted similarities across all tags
     * 4. Normalize each dimension to 0-1 range
     * 5. Return full 13D vector (all dimensions populated)
     *
     * KEY DIFFERENCE FROM OLD APPROACH:
     * - OLD: Used hardcoded tag-mapping dictionary
     * - NEW: Uses FastText word embeddings + cosine similarity
     * - NEW: Automatically handles unseen tags via FastText OOV
     * - NEW: No manual tag curation needed
     *
     * @async
     * @param {ParsedLastfmTag[]} tags - Tags from Last.fm with popularity counts
     * @returns {Promise<Partial<Vector13D>>} Full 13D embedding (all dimensions)
     *
     * @example
     * const tags = [
     *   { tag: "ethereal", count: 100 },
     *   { tag: "atmospheric", count: 80 }
     * ];
     * const embedding = await tagService.mapTagsTo13D(tags);
     * // Returns: { valence: 0.4, arousal: 0.2, spaciousness: 0.82, ... }
     */
    async mapTagsTo13D(tags) {
        console.log(`[TAG-EMBEDDING] Mapping ${tags.length} tags to 13D via semantic similarity...`);
        if (tags.length === 0) {
            console.log(`[TAG-EMBEDDING] No tags provided, returning neutral 13D`);
            // Return neutral embedding when no tags
            return this.getNeutralEmbedding();
        }
        // Accumulate semantic similarities across all tags
        const influenceAccumulator = {};
        const contributionCounts = {}; // Track how many tags influenced each dimension
        const maxCount = Math.max(...tags.map(t => t.count), 1);
        console.log(`[TAG-EMBEDDING] Max tag count: ${maxCount}`);
        // For each tag, get its semantic similarity to all dimensions
        for (const tag of tags) {
            const weight = tag.count / maxCount;
            console.log(`[TAG-EMBEDDING] Processing "${tag.tag}" (count: ${tag.count}, weight: ${weight.toFixed(2)})`);
            // Get semantic similarities via FastText + cosine similarity
            const tagSimilarities = semantic_similarity_service_1.semanticSimilarityService.computeTagDimensionSimilarities(tag.tag);
            // Accumulate weighted similarities
            for (const [dimension, similarity] of Object.entries(tagSimilarities)) {
                if (!influenceAccumulator[dimension]) {
                    influenceAccumulator[dimension] = 0;
                    contributionCounts[dimension] = 0;
                }
                // Weight similarity by tag popularity
                influenceAccumulator[dimension] += (similarity ?? 0.5) * weight;
                contributionCounts[dimension] += 1; // Count this tag as contributing to this dimension
            }
        }
        // Normalize accumulated values to 0-1 range
        // KEY FIX: Normalize by the ACTUAL number of tags that influenced each dimension
        // NOT by the total number of tags (which breaks with sparsification)
        const result = {};
        for (const [dimension, accumulation] of Object.entries(influenceAccumulator)) {
            const contributingTags = contributionCounts[dimension] || 1;
            // Average the influence: accumulation / number of tags that influenced this dimension
            const normalized = Math.min(1, accumulation / contributingTags);
            result[dimension] = normalized;
            console.log(`[TAG-EMBEDDING]   ${dimension}: accumulated=${accumulation.toFixed(2)}, count=${contributingTags}, normalized=${normalized.toFixed(2)}`);
        }
        console.log(`[TAG-EMBEDDING] ✓ Generated 13D embedding from ${tags.length} tags`);
        return result;
    }
    /**
     * Get neutral 13D embedding (all 0.5)
     *
     * Used when no tags available or tag processing fails.
     * Represents complete uncertainty across all dimensions.
     *
     * @private
     * @returns Neutral 13D vector (all 0.5)
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
}
exports.tagEmbeddingService = new TagEmbeddingService();
