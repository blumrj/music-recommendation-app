/**
 * ARTIST EMBEDDING SERVICE
 * 
 * Computes and caches artist-level embeddings by aggregating their album embeddings.
 * 
 * RESPONSIBILITY:
 * - Query all albums by artist from database
 * - Average their 13D embeddings
 * - Cache result to avoid repeated queries
 * - Calculate confidence based on album count (more albums = more stable signal)
 * - Provide graceful fallback for new artists or DB errors
 * 
 * PHILOSOPHY:
 * - Artist embeddings stabilize sparse album data
 * - Cached for performance (TTL: 24 hours)
 * - Confidence grows with artist catalog size (but capped)
 * - Never fails: returns null on error instead of throwing
 * 
 * @category Services
 * @module services/artist-embedding
 */

import { PrismaClient } from "@prisma/client";
import { EmotionalVector } from "../../types/embedding.dto";
import * as vectorMath from "../../shared/math/vector";

const prisma = new PrismaClient();

interface CachedArtistEmbedding {
  embedding: EmotionalVector;
  albumCount: number;
  confidence: number;
  timestamp: number;  // milliseconds since epoch
}

/**
 * Artist Embedding Service
 * 
 * Manages artist-level embeddings via aggregation + caching
 */
class ArtistEmbeddingService {
  // LRU cache: Map<artistName, CachedArtistEmbedding>
  private cache: Map<string, CachedArtistEmbedding> = new Map();
  
  // Cache TTL: 24 hours in milliseconds
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  
  // Maximum cache size (prevent unbounded memory growth)
  private readonly MAX_CACHE_SIZE = 500;

  /**
   * Get or compute artist embedding
   * 
   * First checks cache, then queries DB if needed.
   * Returns null if artist has no albums or DB error occurs.
   * 
   * @async
   * @param artistName - Artist name (from album metadata)
   * @returns { embedding, confidence, albumCount } or null if unavailable
   */
  async getOrComputeArtistEmbedding(
    artistName: string
  ): Promise<{ embedding: EmotionalVector | null; confidence: number; albumCount: number } | null> {
    if (!artistName || artistName.trim().length === 0) {
      console.log(`[ARTIST-EMBEDDING] Invalid artist name`);
      return null;
    }

    const normalizedName = artistName.toLowerCase().trim();

    // Check cache
    const cached = this.getFromCache(normalizedName);
    if (cached) {
      console.log(`[ARTIST-EMBEDDING] ✓ Cache hit for artist: ${artistName} (${cached.albumCount} albums, conf: ${cached.confidence.toFixed(2)})`);
      return {
        embedding: cached.embedding,
        confidence: cached.confidence,
        albumCount: cached.albumCount
      };
    }

    // Cache miss: compute from DB
    try {
      const result = await this.computeArtistAverage(normalizedName, artistName);
      
      if (!result) {
        console.log(`[ARTIST-EMBEDDING] ✗ No albums found for artist: ${artistName}`);
        return null;
      }

      // Store in cache
      this.setInCache(normalizedName, result);
      
      console.log(`[ARTIST-EMBEDDING] ✓ Computed for artist: ${artistName} (${result.albumCount} albums, conf: ${result.confidence.toFixed(2)})`);
      
      return {
        embedding: result.embedding,
        confidence: result.confidence,
        albumCount: result.albumCount
      };
    } catch (error: any) {
      console.error(`[ARTIST-EMBEDDING] Error computing embedding for ${artistName}:`, error.message);
      return null;  // Graceful fallback
    }
  }

  /**
   * Compute average embedding from all albums by artist
   * 
   * ALGORITHM:
   * 1. Query DB: SELECT * FROM AlbumEmotionalEmbedding WHERE artist = ?
   * 2. Filter: only include embeddings with confidence > 0 (valid embeddings)
   * 3. Average all 13D vectors
   * 4. Calculate confidence: 0.4 + min(0.3, albumCount / 20)
   *    - Range: 0.4 (1 album) to 0.7 (20+ albums)
   * 5. Return { embedding, albumCount, confidence }
   * 
   * @private
   * @async
   * @param normalizedName - Artist name (lowercase, trimmed)
   * @param originalName - Original artist name (for logging)
   * @returns Result or null if no albums found
   */
  private async computeArtistAverage(
    normalizedName: string,
    originalName: string
  ): Promise<{ embedding: EmotionalVector; albumCount: number; confidence: number } | null> {
    console.log(`[ARTIST-EMBEDDING] Querying DB for artist: ${originalName}`);

    try {
      // Query all albums by this artist with their intrinsic dimensions
      const albums = await prisma.album.findMany({
        where: {
          artist: {
            contains: originalName,
            mode: 'insensitive' as any
          }
        },
        include: {
          intrinsicProfileDimensions: {
            include: { dimension: true }
          }
        }
      });

      if (albums.length === 0) {
        console.log(`[ARTIST-EMBEDDING] No albums found for artist: ${originalName}`);
        return null;
      }

      console.log(`[ARTIST-EMBEDDING] Found ${albums.length} albums for ${originalName}`);

      // Collect all dimension embeddings from all albums
      const embeddingsByDimension: { [key: string]: number[] } = {};

      for (const album of albums) {
        for (const dimData of album.intrinsicProfileDimensions) {
          if (!embeddingsByDimension[dimData.dimension.name]) {
            embeddingsByDimension[dimData.dimension.name] = [];
          }
          embeddingsByDimension[dimData.dimension.name].push(dimData.value);
        }
      }

      // Average the embeddings for each dimension
      const artistEmbedding: EmotionalVector = {
        valence: 0.5,
        arousal: 0.5,
        tension: 0.5,
        warmth: 0.5,
        intimacy: 0.5,
        density: 0.5,
        groundedness: 0.5
      };

      for (const [dimensionName, values] of Object.entries(embeddingsByDimension)) {
        if (values.length > 0) {
          const average = values.reduce((a, b) => a + b, 0) / values.length;
          artistEmbedding[dimensionName as keyof EmotionalVector] = average;
        }
      }

      return {
        embedding: artistEmbedding,
        albumCount: albums.length,
        confidence: 0.8 // Database query has high confidence
      };
    } catch (error: any) {
      console.error(`[ARTIST-EMBEDDING] DB query error:`, error.message);
      return null;
    }
  }

  /**
   * Get from cache if valid (not expired)
   * 
   * @private
   * @param normalizedName - Normalized artist name
   * @returns Cached result or null if not found/expired
   */
  private getFromCache(normalizedName: string): CachedArtistEmbedding | null {
    const cached = this.cache.get(normalizedName);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    const ageMs = Date.now() - cached.timestamp;
    if (ageMs > this.CACHE_TTL_MS) {
      this.cache.delete(normalizedName);
      return null;
    }

    return cached;
  }

  /**
   * Store in cache with LRU eviction if needed
   * 
   * @private
   * @param normalizedName - Normalized artist name
   * @param result - Embedding result to cache
   */
  private setInCache(
    normalizedName: string,
    result: { embedding: EmotionalVector; albumCount: number; confidence: number }
  ): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        console.log(`[ARTIST-EMBEDDING] Cache evicted oldest entry (size: ${this.cache.size}/${this.MAX_CACHE_SIZE})`);
      }
    }

    this.cache.set(normalizedName, {
      embedding: result.embedding,
      albumCount: result.albumCount,
      confidence: result.confidence,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all cached artist embeddings
   * (Useful for manual cache invalidation or testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`[ARTIST-EMBEDDING] Cache cleared`);
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { size: number; maxSize: number; entries: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Manually refresh cache entry for artist
   * (Useful if artist albums were recently added to DB)
   * 
   * @async
   * @param artistName - Artist name to refresh
   */
  async refreshCacheEntry(artistName: string): Promise<void> {
    const normalizedName = artistName.toLowerCase().trim();
    this.cache.delete(normalizedName);  // Remove from cache
    console.log(`[ARTIST-EMBEDDING] Cache invalidated for artist: ${artistName}`);
  }
}

// Export singleton instance
export const artistEmbeddingService = new ArtistEmbeddingService();
