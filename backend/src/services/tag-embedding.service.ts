/**
 * TAG EMBEDDING SERVICE
 * 
 * Converts semantic tags (from Last.fm) into 7D emotional influence vectors.
 * 
 * ARCHITECTURE CHANGE (Semantic Similarity):
 * - REPLACES hardcoded tag-mapping with FastText semantic similarity
 * - For any Last.fm tag, computes similarity to all 7 emotional dimensions
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

import { semanticSimilarityService } from "./semantic-similarity.service";
import { EmotionalVector } from "../types/embedding.dto";
import { ParsedLastfmTag } from "../types/lastfm.dto";

/**
 * Tag Embedding Service
 * 
 * Converts Last.fm tags → 7D emotional influence vectors
 */
class TagEmbeddingService {
  /**
   * Map Last.fm tags to 7D emotional embedding via semantic similarity
   * 
   * ALGORITHM (SEMANTIC SIMILARITY):
   * 1. For each tag, compute semantic similarity to all 7 dimensions
   * 2. Weight similarities by tag popularity (count)
   * 3. Accumulate weighted similarities across all tags
   * 4. Normalize each dimension to 0-1 range
   * 5. Return full 7D vector (all dimensions populated)
   * 
   * KEY DIFFERENCE FROM OLD APPROACH:
   * - OLD: Used hardcoded tag-mapping dictionary
   * - NEW: Uses FastText word embeddings + cosine similarity
   * - NEW: Automatically handles unseen tags via FastText OOV
   * - NEW: No manual tag curation needed
   * 
   * @async
   * @param {ParsedLastfmTag[]} tags - Tags from Last.fm with popularity counts
   * @returns {Promise<Partial<EmotionalVector>>} Full 7D embedding (all dimensions)
   * 
   * @example
   * const tags = [
   *   { tag: "ethereal", count: 100 },
   *   { tag: "atmospheric", count: 80 }
   * ];
   * const embedding = await tagService.mapTagsTo13D(tags);
   * // Returns: { valence: 0.4, arousal: 0.2, groundedness: 0.82, ... }
   */
  async mapTagsTo13D(tags: ParsedLastfmTag[]): Promise<Partial<EmotionalVector>> {
    console.log(`[TAG-EMBEDDING] Mapping ${tags.length} tags to 7D via semantic similarity...`);

    if (tags.length === 0) {
      console.log(`[TAG-EMBEDDING] No tags provided, returning neutral 7D`);
      // Return neutral embedding when no tags
      return this.getNeutralEmbedding();
    }

    // Accumulate semantic similarities across all tags
    const influenceAccumulator: Record<string, number> = {};
    const contributionCounts: Record<string, number> = {};  // Track how many tags influenced each dimension
    const maxCount = Math.max(...tags.map(t => t.count), 1);

    console.log(`[TAG-EMBEDDING] Max tag count: ${maxCount}`);

    // For each tag, get its semantic similarity to all dimensions
    for (const tag of tags) {
      const weight = tag.count / maxCount;
      console.log(`[TAG-EMBEDDING] Processing "${tag.tag}" (count: ${tag.count}, weight: ${weight.toFixed(2)})`);

      // Get semantic similarities via FastText + cosine similarity
      const tagSimilarities = semanticSimilarityService.computeTagDimensionSimilarities(tag.tag);

      // Accumulate weighted similarities
      for (const [dimension, similarity] of Object.entries(tagSimilarities)) {
        if (!influenceAccumulator[dimension]) {
          influenceAccumulator[dimension] = 0;
          contributionCounts[dimension] = 0;
        }
        // Weight similarity by tag popularity
        influenceAccumulator[dimension] += (similarity ?? 0.5) * weight;
        contributionCounts[dimension] += 1;  // Count this tag as contributing to this dimension
      }
    }

    // Normalize accumulated values to 0-1 range
    // KEY FIX: Normalize by the ACTUAL number of tags that influenced each dimension
    // NOT by the total number of tags (which breaks with sparsification)
    const result: Partial<EmotionalVector> = {};
    for (const [dimension, accumulation] of Object.entries(influenceAccumulator)) {
      const contributingTags = contributionCounts[dimension] || 1;
      // Average the influence: accumulation / number of tags that influenced this dimension
      const normalized = Math.min(1, accumulation / contributingTags);
      (result as any)[dimension] = normalized;
      console.log(`[TAG-EMBEDDING]   ${dimension}: accumulated=${accumulation.toFixed(2)}, count=${contributingTags}, normalized=${normalized.toFixed(2)}`);
    }

    console.log(`[TAG-EMBEDDING] ✓ Generated 7D embedding from ${tags.length} tags`);

    return result;
  }

  /**
   * Get neutral 7D embedding (all 0.5)
   * 
   * Used when no tags available or tag processing fails.
   * Represents complete uncertainty across all dimensions.
   * 
   * @private
   * @returns Neutral 7D vector (all 0.5)
   */
  private getNeutralEmbedding(): Partial<EmotionalVector> {
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

export const tagEmbeddingService = new TagEmbeddingService();
