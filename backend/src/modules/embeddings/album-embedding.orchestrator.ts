/**
 * ALBUM EMBEDDING SERVICE
 * 
 * Computes and manages 7D emotional embeddings for albums using Last.fm tags.
 * 
 * RESPONSIBILITY:
 * - Map Last.fm tags → 7D emotional dimensions (via semantic similarity)
 * - Fuse multiple signals (emotional tags, genre, artist, global prior)
 * - Compute confidence scores
 * - Cache embeddings for performance
 * 
 * ARCHITECTURE:
 * Embeddings are the foundation of the vector space recommendation system.
 * Each album gets a fixed 7D point that represents its intrinsic emotional properties.
 * Data source: Last.fm community tags (no external audio features)
 * 
 * @category Services
 * @module services/album-embedding
 */

import { PrismaClient } from "@prisma/client";
import {
  EmotionalVector,
  AlbumEmbedding,
} from "../../types/embedding.dto";
import { lastfmClient } from "../../infrastructure/lastfm/lastfm-client";
import { signalFusionService } from "./signal-fusion.service";
import { tagClassifierService } from "./tag-classifier.service";
import { ParsedLastfmTag } from "../../types/lastfm.dto";
import { logger } from "../../shared/logger";

const prisma = new PrismaClient();
const DIMS = ["valence", "arousal", "tension", "warmth", "intimacy", "density", "groundedness"] as const;

let dimensionIdCache: Map<string, string> | null = null;
async function getDimensionIds(): Promise<Map<string, string>> {
  if (!dimensionIdCache) {
    const dims = await prisma.dimension.findMany({ select: { id: true, name: true } });
    dimensionIdCache = new Map(dims.map(d => [d.name, d.id]));
  }
  return dimensionIdCache;
}

/**
 * Album Embedding Service
 * 
 * Orchestrates computation and caching of 7D album embeddings from Last.fm tags.
 * 
 * @class AlbumEmbeddingService
 */
class AlbumEmbeddingService {
    /**
   * CREATE EMBEDDING FROM LAST.FM TAGS ONLY
   * 
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
  private async createEmbeddingFromLastfm(
    albumName: string,
    artist: string
  ): Promise<{
    embedding: EmotionalVector | null;
    tags: ParsedLastfmTag[];
    enrichmentStatus: string;
    confidence: number;
  }> {
    logger.info("EMBEDDING", `Creating Last.fm-only embedding for "${albumName}" by ${artist}`);

    try {
      // STEP 1: Fetch album tags
      let tags = await lastfmClient.fetchAlbumTags(artist, albumName);

      // STEP 2: Fallback to artist tags if album not found
      if (tags.length === 0) {
        logger.info("EMBEDDING", `Album not found in Last.fm, trying artist...`);
        tags = await lastfmClient.fetchArtistTags(artist);
      }

      // STEP 3: If we got tags, use signal fusion to create embedding
      if (tags.length > 0) {
        logger.info("EMBEDDING", `Got ${tags.length} tags, using signal fusion...`);

        // Classify tags into emotional, genre, metadata, other
        const classified = tagClassifierService.classify(tags);
        logger.info("EMBEDDING", `Classified tags: ${classified.metrics.emotionalCount} emotional, ${classified.metrics.genreCount} genre, ${classified.metrics.metadataCount} metadata`);

        // Extract tag strings for signal fusion
        const emotionalTags = classified.emotional;
        const genreTags = classified.genre;

        logger.info("EMBEDDING", `Calling signal fusion with emotional=${emotionalTags.length}, genre=${genreTags.length}, artist=${artist}`);

        // STEP 4: Fuse all signals (emotional + genre + artist + global)
        const fusionResult = await signalFusionService.fuseSignals({
          emotionalTags,
          genreTags,
          artistName: artist
        });

        logger.info("EMBEDDING", `Signal fusion complete: confidence=${fusionResult.confidence.toFixed(2)}`);
        logger.withData("EMBEDDING", "Signal breakdown", {
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
      } else {
        logger.info("EMBEDDING", `No Last.fm tags found - cannot create embedding without data`);
        return {
          embedding: null,
          tags: [],
          enrichmentStatus: "no-data",
          confidence: 0.0
        };
      }
    } catch (error: any) {
      logger.error("EMBEDDING", `Last.fm-only creation failed: ${error.message}`);
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
  private createDefaultEmbedding(): EmotionalVector {
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

  private async loadFromDb(albumId: string): Promise<EmotionalVector | null> {
    const records = await prisma.albumIntrinsicProfileDimension.findMany({
      where: { albumId },
      include: { dimension: true }
    });
    if (records.length < 7) return null;
    const vec: Record<string, number> = {};
    for (const r of records) vec[r.dimension.name] = r.value;
    return vec as unknown as EmotionalVector;
  }

  private async persistToDb(albumId: string, embedding: EmotionalVector, confidence: number): Promise<void> {
    try {
      const dimIds = await getDimensionIds();
      for (const dim of DIMS) {
        const dimensionId = dimIds.get(dim);
        if (!dimensionId) continue;
        await prisma.albumIntrinsicProfileDimension.upsert({
          where: { albumId_dimensionId: { albumId, dimensionId } },
          update: { value: embedding[dim] },
          create: { albumId, dimensionId, value: embedding[dim] }
        });
      }
      await prisma.album.update({
        where: { id: albumId },
        data: { enrichmentStatus: "embedded", embeddingComputedAt: new Date(), embeddingConfidence: confidence }
      });
      logger.info("EMBEDDING", `✓ Persisted 7D embedding to DB for album ${albumId}`);
    } catch (err: any) {
      logger.warn("EMBEDDING", `Failed to persist embedding for album ${albumId}: ${err.message}`);
    }
  }

  /**
   * Get or compute embedding for an album.
   *
   * When albumId is provided: checks DB first (cache hit), then persists after compute.
   * Without albumId: computes in-memory only (for Last.fm discovery candidates).
   */
  async getOrComputeEmbedding(
    metadata?: { albumName?: string; artist?: string; imageUrl?: string; spotifyUrl?: string; albumId?: string; trackCount?: number; popularity?: number }
  ): Promise<AlbumEmbedding> {
    if (!metadata?.albumName || !metadata?.artist) {
      logger.info("EMBEDDING", `No album metadata - returning neutral embedding`);
      return this.createDefaultEmbedding() as any;
    }

    // DB-first: return pre-computed embedding if available
    if (metadata.albumId) {
      const stored = await this.loadFromDb(metadata.albumId);
      if (stored) {
        logger.info("EMBEDDING", `✓ Cache hit for album ${metadata.albumId}`);
        return {
          ...stored,
          derivedFrom: "lastfm",
          confidence: 0.8,
          albumName: metadata.albumName,
          artist: metadata.artist,
          imageUrl: metadata.imageUrl,
        } as any;
      }
    }

    const result = await this.createEmbeddingFromLastfm(metadata.albumName, metadata.artist);
    const embedding = result.embedding || this.createDefaultEmbedding();

    // Persist to DB if we have a real embedding (not default fallback)
    if (metadata.albumId && result.embedding) {
      await this.persistToDb(metadata.albumId, embedding, result.confidence);
    }

    return {
      valence: embedding.valence,
      arousal: embedding.arousal,
      tension: embedding.tension,
      warmth: embedding.warmth,
      intimacy: embedding.intimacy,
      density: embedding.density,
      groundedness: embedding.groundedness,
      derivedFrom: "lastfm",
      confidence: result.confidence || 0.5,
      enrichmentStatus: result.enrichmentStatus,
      albumName: metadata?.albumName,
      artist: metadata?.artist,
      imageUrl: metadata?.imageUrl,
      spotifyUrl: metadata?.spotifyUrl,
      tags: result.tags && result.tags.length > 0 ? result.tags : undefined
    } as any;
  }

}

export const albumEmbeddingService = new AlbumEmbeddingService();
export const albumEmbeddingOrchestrator = albumEmbeddingService;
