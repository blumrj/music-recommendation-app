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

import { EmotionalVector } from "../types/embedding.dto";
import { ParsedLastfmTag } from "../types/lastfm.dto";
import { tagEmbeddingService } from "./tag-embedding.service";
import { artistEmbeddingService } from "./artist-embedding.service";
import { getDimensionNames } from "../config/emotional-dimensions";
import { getGenrePrior } from "../config/genre-priors";
import * as vectorMath from "../utils/vector-math";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SignalContribution {
  weight: number;
  embedding: EmotionalVector | null;
  confidence: number;
  metadata?: Record<string, any>;
}

interface SignalFusionResult {
  embedding: EmotionalVector;
  confidence: number;
  signalBreakdown: {
    emotional: SignalContribution;
    genre: SignalContribution;
    artist: SignalContribution;
    global: SignalContribution;
  };
}

/**
 * Signal Fusion Service
 * 
 * Blends multiple embedding sources with adaptive weighting
 */
class SignalFusionService {
  private globalPrior: EmotionalVector | null = null;
  private globalPriorTimestamp: number = 0;
  private readonly GLOBAL_PRIOR_TTL_MS = 24 * 60 * 60 * 1000;  // 24 hours

  constructor() {
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
  private async initializeGlobalPrior(): Promise<void> {
    try {
      const albums = await prisma.albumEmotionalEmbedding.findMany({
        select: {
          valence: true,
          arousal: true,
          tension: true,
          warmth: true,
          intimacy: true,
          density: true,
          groundedness: true
        },
        take: 10000  // Limit to first 10k albums for performance
      });

      if (albums.length === 0) {
        // No albums: use neutral prior
        this.globalPrior = this.getNeutralEmbedding();
        console.log(`[SIGNAL-FUSION] Global prior: neutral (no albums in DB)`);
      } else {
        this.globalPrior = vectorMath.averageVectors(albums);
        this.globalPriorTimestamp = Date.now();
        console.log(`[SIGNAL-FUSION] Global prior initialized (${albums.length} albums)`);
      }
    } catch (error: any) {
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
  private async getGlobalPrior(): Promise<EmotionalVector> {
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
  async fuseSignals(input: {
    emotionalTags: string[];
    genreTags: string[];
    artistName: string;
  }): Promise<SignalFusionResult> {
    console.log(`[SIGNAL-FUSION] Fusing signals for album (artist: ${input.artistName})`);

    // STEP 1: Compute all signals in parallel
    console.log(`[SIGNAL-FUSION]   - Computing emotional signal (${input.emotionalTags.length} tags)...`);
    console.log(`[SIGNAL-FUSION]   - Computing genre signal (${input.genreTags.length} tags)...`);
    console.log(`[SIGNAL-FUSION]   - Computing artist signal...`);
    console.log(`[SIGNAL-FUSION]   - Getting global prior...`);

    const [emotionalSignal, genreSignal, artistSignal, globalSignal] = await Promise.all([
      this.computeEmotionalSignal(input.emotionalTags),
      this.computeGenreSignal(input.genreTags),
      artistEmbeddingService.getOrComputeArtistEmbedding(input.artistName),
      this.getGlobalPrior()
    ]);

    // STEP 2: Calculate signal presence weights (0-1 per signal)
    // MINIMAL AVERAGING: Artist and global signals dramatically reduced
    // Emotional + genre signals now nearly exclusive control
    const w_emotional = emotionalSignal.embedding ? 1.0 : 0.0;
    const w_genre = genreSignal.embedding ? 0.3 : 0.0;
    const w_artist = artistSignal?.embedding
      ? Math.min(0.08, (artistSignal.albumCount / 10) * 0.08)  // REDUCED from 0.15 to 0.08
      : 0.0;
    const w_global = 0.02;  // REDUCED from 0.05 to 0.02 (minimal centering pull)

    console.log(`[SIGNAL-FUSION]   Weights: emotional=${w_emotional}, genre=${w_genre}, artist=${w_artist.toFixed(2)}, global=${w_global}`);

    // STEP 3: Normalize weights
    const totalWeight = w_emotional + w_genre + w_artist + w_global;
    const w_e_norm = w_emotional / totalWeight;
    const w_g_norm = w_genre / totalWeight;
    const w_a_norm = w_artist / totalWeight;
    const w_gl_norm = w_global / totalWeight;

    console.log(`[SIGNAL-FUSION]   Normalized: emotional=${w_e_norm.toFixed(2)}, genre=${w_g_norm.toFixed(2)}, artist=${w_a_norm.toFixed(2)}, global=${w_gl_norm.toFixed(2)}`);

    // STEP 4: Blend embeddings (weighted average per dimension)
    const blended = this.blendEmbeddings(
      emotionalSignal.embedding,
      genreSignal.embedding,
      artistSignal?.embedding ?? null,
      globalSignal,
      w_e_norm,
      w_g_norm,
      w_a_norm,
      w_gl_norm
    );

    // STEP 4.5: Apply contrast sharpening
    // Push values away from 0.5 to increase emotional distinctiveness
    // and reduce embedding collapse
    const sharpened = this.sharpenContrast(blended);

    // STEP 5: Calculate confidence (sum of available signal strengths)
    const confidence = this.calculateConfidence(
      w_emotional,
      w_genre,
      w_artist,
      w_global
    );

    console.log(`[SIGNAL-FUSION] ✓ Final confidence: ${confidence.toFixed(2)}`);

    const result: SignalFusionResult = {
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
  private async computeEmotionalSignal(
    emotionalTags: string[]
  ): Promise<{ embedding: EmotionalVector | null; confidence: number }> {
    if (emotionalTags.length === 0) {
      return { embedding: null, confidence: 0.0 };
    }

    try {
      // Convert to ParsedLastfmTag format
      const tags: ParsedLastfmTag[] = emotionalTags.map((tag, idx) => ({
        tag,
        count: emotionalTags.length - idx  // Weight by position (first tags have higher count)
      }));

      const embedding = await tagEmbeddingService.mapTagsTo13D(tags);
      
      // Confidence: 0.8 + (emotionalTagCount / totalTags) × 0.2
      // But we only have emotional tags here, so use tag count relative to assumed total
      const confidence = 0.8 + Math.min(0.2, emotionalTags.length / 5 * 0.1);

      return {
        embedding: embedding as EmotionalVector,
        confidence: Math.min(1.0, confidence)
      };
    } catch (error: any) {
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
  private async computeGenreSignal(
    genreTags: string[]
  ): Promise<{ embedding: EmotionalVector | null; confidence: number }> {
    if (genreTags.length === 0) {
      return { embedding: null, confidence: 0.0 };
    }

    try {
      const accumulated: Record<string, number> = {};
      let foundGenres = 0;

      // For each genre tag, look up prior and accumulate
      for (const genre of genreTags) {
        const prior = getGenrePrior(genre);
        if (!prior) {
          continue;
        }

        foundGenres++;

        // Accumulate deviations
        for (const [dim, deviation] of Object.entries(prior)) {
          if (dim === "confidence") continue;
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
      const embedding: Record<string, number> = {};
      const dims = getDimensionNames();
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
        embedding: embedding as unknown as EmotionalVector,
        confidence: Math.min(1.0, confidence)
      };
    } catch (error: any) {
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
  private blendEmbeddings(
    emotional: EmotionalVector | null,
    genre: EmotionalVector | null,
    artist: EmotionalVector | null,
    global: EmotionalVector,
    w_e: number,
    w_g: number,
    w_a: number,
    w_gl: number
  ): EmotionalVector {
    const blended: Record<string, number> = {};
    const dims = getDimensionNames();

    for (const dim of dims) {
      const dimKey = dim as keyof EmotionalVector;
      
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

    return blended as unknown as EmotionalVector;
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
  private calculateConfidence(
    w_emotional: number,
    w_genre: number,
    w_artist: number,
    w_global: number
  ): number {
    let confidence = 0.0;

    if (w_emotional > 0) confidence += 0.8;      // Emotional tags = high
    if (w_genre > 0) confidence += 0.15;         // Genre = medium
    if (w_artist > 0) confidence += Math.min(0.2, w_artist);  // Artist = up to 0.2
    if (w_global > 0) confidence += 0.1;         // Global = baseline

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Get neutral 7D embedding (all 0.5)
   * 
   * @private
   */
  private getNeutralEmbedding(): EmotionalVector {
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
  async refreshGlobalPrior(): Promise<void> {
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
  private sharpenContrast(embedding: EmotionalVector): EmotionalVector {
    const sharpened: Record<string, number> = {};
    const dims = getDimensionNames();
    
    // Aggressive sharpening parameters
    const NEUTRAL_ZONE_MIN = 0.35;
    const NEUTRAL_ZONE_MAX = 0.65;
    const SHARPENING_STRENGTH = 1.8;  // INCREASED from 1.3 to 1.8 (80% amplification)
    
    for (const dim of dims) {
      const val = embedding[dim as keyof EmotionalVector] ?? 0.5;
      
      // Apply aggressive sharpening to all values in/near neutral zone
      if (val >= NEUTRAL_ZONE_MIN && val <= NEUTRAL_ZONE_MAX) {
        // Strong push: values in [0.35, 0.65] → far from center
        const deviation = val - 0.5;
        const sharpenedDeviation = deviation * SHARPENING_STRENGTH;
        const sharpenedVal = 0.5 + sharpenedDeviation;
        sharpened[dim] = Math.max(0, Math.min(1, sharpenedVal));
      } else if (val > 0.25 && val < 0.75) {
        // Mild push for near-neutral values: [0.25-0.35] or [0.65-0.75]
        const deviation = val - 0.5;
        const sharpenedDeviation = deviation * 1.4;  // 40% amplification for these
        const sharpenedVal = 0.5 + sharpenedDeviation;
        sharpened[dim] = Math.max(0, Math.min(1, sharpenedVal));
      } else {
        // Extremely polarized, keep unchanged
        sharpened[dim] = val;
      }
    }
    
    return sharpened as unknown as EmotionalVector;
  }
}

// Export singleton instance
export const signalFusionService = new SignalFusionService();
