/**
 * CANDIDATE POOL SERVICE (Read-Only Catalog)
 *
 * Queries the pre-embedded album catalog from the database.
 * All embeddings must be pre-computed by the catalog workers — no external
 * API calls are made here.
 *
 * Workers (backend/src/workers/catalog/) are responsible for:
 *   discover.ts  → create Album records from Last.fm
 *   enrich.ts    → fetch and persist Last.fm tags
 *   embed.ts     → compute and persist 7D embeddings
 *
 * @category Services
 * @module services/candidate-pool
 */

import { PrismaClient } from "@prisma/client";
import { EmotionalVector } from "../../types/embedding.dto";

const prisma = new PrismaClient();

export interface EmbeddedAlbumCandidate {
  albumId: string;
  albumName: string;
  artist: string;
  imageUrl: string | null;
  spotifyUrl: string | null;
  embedding: EmotionalVector;
}

const DIMS = ["valence", "arousal", "tension", "warmth", "intimacy", "density", "groundedness"] as const;

class CandidatePoolService {
  /**
   * Return the count of albums that are ready for recommendations.
   */
  async countEmbedded(): Promise<number> {
    return prisma.album.count({ where: { enrichmentStatus: "embedded" } });
  }

  /**
   * Load embedded catalog candidates for a user.
   *
   * Excludes albums the user has already surveyed.
   * Returns at most `limit` albums (default 300).
   */
  async getEmbeddedCatalog(userId: string, limit = 300): Promise<EmbeddedAlbumCandidate[]> {
    const surveyedAlbumIds = await prisma.albumSurvey
      .findMany({ where: { userId }, select: { albumId: true } })
      .then(rows => rows.map(r => r.albumId));

    const albums = await prisma.album.findMany({
      where: {
        enrichmentStatus: "embedded",
        id: { notIn: surveyedAlbumIds }
      },
      select: {
        id: true,
        title: true,
        artist: true,
        imageUrl: true,
        intrinsicProfileDimensions: {
          select: { value: true, dimension: { select: { name: true } } }
        },
        externalIds: {
          where: { provider: "spotify" },
          select: { externalId: true, providerMetadata: true }
        }
      },
      take: limit
    });

    const candidates: EmbeddedAlbumCandidate[] = [];

    for (const album of albums) {
      if (album.intrinsicProfileDimensions.length < 7) continue;

      const vec: Record<string, number> = {};
      for (const d of album.intrinsicProfileDimensions) {
        vec[d.dimension.name] = d.value;
      }

      // Verify all 7 dimensions are present
      if (DIMS.some(dim => vec[dim] === undefined)) continue;

      const spotifyExt = album.externalIds[0];
      const meta = spotifyExt?.providerMetadata as Record<string, string> | null;
      const spotifyUrl = meta?.url
        ?? (spotifyExt ? `https://open.spotify.com/album/${spotifyExt.externalId}` : null);

      candidates.push({
        albumId: album.id,
        albumName: album.title,
        artist: album.artist,
        imageUrl: album.imageUrl,
        spotifyUrl,
        embedding: vec as unknown as EmotionalVector
      });
    }

    return candidates;
  }
}

export const candidatePoolService = new CandidatePoolService();
