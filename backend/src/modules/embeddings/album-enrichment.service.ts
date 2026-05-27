/**
 * ALBUM ENRICHMENT SERVICE
 * 
 * Orchestrates the enrichment pipeline:
 * base embedding + Last.fm tag influences → enriched embedding
 * 
 * RESPONSIBILITY:
 * - Blend base (audio) embeddings with tag influences
 * - Handle cases where tags are unavailable
 * - Ensure all dimensions stay in 0-1 range
 * - Log enrichment details for debugging
 * 
 * PHILOSOPHY:
 * - Base embedding: grounded in scientific audio features
 * - Tag influences: community semantic signals
 * - Blend: best of both, weighted by confidence
 * 
 * @category Services
 * @module services/album-enrichment
 */

import { EmotionalVector } from "../../types/embedding.dto";
import { tagEmbeddingService } from "./tag-embedding.service";
import { ParsedLastfmTag } from "../../types/lastfm.dto";

/**
 * Album Enrichment Service
 * 
 * Blends audio-based embeddings with semantic tag influences.
 */
class AlbumEnrichmentService {
  /**
   * Enrich album embedding with Last.fm tags
   * 
   * ALGORITHM:
   * 1. If no tags: return base embedding unchanged
   * 2. Get tag influences via tag-embedding service
   * 3. Blend base + influences with configurable weights
   * 4. Clamp all dimensions to 0-1
   * 5. Mark enrichment status
   * 
   * BLENDING WEIGHTS (configurable):
   * - Base embedding: 70% (grounded in science)
   * - Tag influences: 30% (semantic community signal)
   * - Can be tuned based on recommendation quality
   * 
   * @async
   * @param {EmotionalVector} baseEmbedding - Embedding from audio features
   * @param {ParsedLastfmTag[]} tags - Tags from Last.fm
   * @returns {Promise<{ embedding: EmotionalVector; enrichmentStatus: string }>} Enriched embedding + status
   * 
   * @example
   * const baseEmbedding = { valence: 0.5, arousal: 0.6, ... };
   * const tags = [{ tag: "dreamy", count: 250 }, ...];
   * const result = await enrichmentService.enrichEmbedding(baseEmbedding, tags);
   * // Returns: {
   * //   embedding: { valence: 0.5, arousal: 0.6, spaciousness: 0.65, ... },
   * //   enrichmentStatus: "enriched"
   * // }
   */
  async enrichEmbedding(
    baseEmbedding: EmotionalVector,
    tags: ParsedLastfmTag[]
  ): Promise<{
    embedding: EmotionalVector;
    enrichmentStatus: string;
  }> {
    console.log(`[ENRICHMENT] Starting enrichment with ${tags.length} tags...`);

    // CASE 1: No tags → return base embedding unchanged
    if (tags.length === 0) {
      console.log(`[ENRICHMENT] No tags provided, returning base embedding (audio-only)`);
      return {
        embedding: baseEmbedding,
        enrichmentStatus: "audio-only"
      };
    }

    try {
      // CASE 2: Tags available → blend embeddings
      
      // STEP 1: Get tag embedding via semantic similarity (already normalized [0, 1])
      const tagEmbedding = await tagEmbeddingService.mapTagsTo13D(tags);
      
      if (Object.keys(tagEmbedding).length === 0) {
        console.warn(`[ENRICHMENT] Tag embedding empty, returning base embedding`);
        return {
          embedding: baseEmbedding,
          enrichmentStatus: "audio-only"
        };
      }

      console.log(`[ENRICHMENT] Got tag embedding for ${Object.keys(tagEmbedding).length} dimensions`);

      // STEP 2: Blend embeddings
      // For each dimension, compute: base * 0.7 + tag * 0.3
      // This ensures: tag influences enrich but don't dominate base audio features
      const enriched: EmotionalVector = {
        // Copy base values, then blend in tag embeddings
        valence: this.blendDimension(baseEmbedding.valence, (tagEmbedding as any).valence),
        arousal: this.blendDimension(baseEmbedding.arousal, (tagEmbedding as any).arousal),
        tension: this.blendDimension(baseEmbedding.tension, (tagEmbedding as any).tension),
        warmth: this.blendDimension(baseEmbedding.warmth, (tagEmbedding as any).warmth),
        intimacy: this.blendDimension(baseEmbedding.intimacy, (tagEmbedding as any).intimacy),
        density: this.blendDimension(baseEmbedding.density, (tagEmbedding as any).density),
        groundedness: this.blendDimension(baseEmbedding.groundedness, (tagEmbedding as any).groundedness),
      };

      console.log(`[ENRICHMENT] ✓ Blended embedding:`);
      this.logDimensions(enriched);

      return {
        embedding: enriched,
        enrichmentStatus: "enriched"
      };
    } catch (error: any) {
      console.error(`[ENRICHMENT] Error during enrichment: ${error.message}`);
      console.log(`[ENRICHMENT] Falling back to base embedding`);
      return {
        embedding: baseEmbedding,
        enrichmentStatus: "audio-only"
      };
    }
  }

  /**
   * Blend a single dimension (base + tag embedding)
   * 
   * Formula: base * 0.7 + tag * 0.3
   * 
   * This gives:
   * - Base audio embedding 70% weight
   * - Tag semantic embedding 30% weight
   * - Result is normalized to 0-1
   * 
   * Both inputs are already [0, 1], so result is guaranteed [0, 1].
   * 
   * @private
   * @param {number} baseValue - Base embedding dimension (0-1)
   * @param {number} [tagValue] - Tag semantic embedding (0-1)
   * @returns {number} Blended value (0-1)
   */
  private blendDimension(baseValue: number, tagValue?: number): number {
    // No tag value? Return base unchanged
    if (tagValue === undefined) {
      return baseValue;
    }

    // Blend: base 70%, tag 30%
    const blended = baseValue * 0.7 + tagValue * 0.3;
    
    // Should already be [0, 1] but clamp for safety
    return Math.max(0, Math.min(1, blended));
  }

  /**
   * Log all dimensions for debugging
   * 
   * @private
   * @param {EmotionalVector} embedding - Embedding to log
   */
  private logDimensions(embedding: EmotionalVector): void {
    console.log(`[ENRICHMENT]   valence: ${embedding.valence.toFixed(2)}`);
    console.log(`[ENRICHMENT]   arousal: ${embedding.arousal.toFixed(2)}`);
    console.log(`[ENRICHMENT]   tension: ${embedding.tension.toFixed(2)}`);
    console.log(`[ENRICHMENT]   warmth: ${embedding.warmth.toFixed(2)}`);
    console.log(`[ENRICHMENT]   intimacy: ${embedding.intimacy.toFixed(2)}`);
    console.log(`[ENRICHMENT]   density: ${embedding.density.toFixed(2)}`);
    console.log(`[ENRICHMENT]   groundedness: ${embedding.groundedness.toFixed(2)}`);
  }
}

export const albumEnrichmentService = new AlbumEnrichmentService();
