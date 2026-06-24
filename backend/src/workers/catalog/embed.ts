/**
 * Catalog Embed Worker
 *
 * For every Album with enrichmentStatus = 'enriched', reads cached lastFmTags,
 * computes the 7D emotional embedding, and persists to AlbumIntrinsicProfileDimension.
 * Sets enrichmentStatus = 'embedded'. Makes zero Last.fm API calls.
 *
 * Run: npx ts-node src/workers/catalog/embed.ts [--batch 100]
 */

import { PrismaClient } from "@prisma/client";
import { tagClassifierService } from "../../modules/embeddings/tag-classifier.service";
import { signalFusionService } from "../../modules/embeddings/signal-fusion.service";
import { ParsedLastfmTag } from "../../types/lastfm.dto";

const prisma = new PrismaClient();
const BATCH = parseInt(process.argv.find(a => a.startsWith("--batch="))?.split("=")[1] ?? "100");
const DIMS = ["valence", "arousal", "tension", "warmth", "intimacy", "density", "groundedness"] as const;

let dimensionIdCache: Map<string, string> | null = null;
async function getDimensionIds(): Promise<Map<string, string>> {
  if (!dimensionIdCache) {
    const dims = await prisma.dimension.findMany({ select: { id: true, name: true } });
    dimensionIdCache = new Map(dims.map(d => [d.name, d.id]));
  }
  return dimensionIdCache;
}

async function run() {
  const job = await prisma.processingJob.create({
    data: { jobType: "embed", status: "running", startedAt: new Date() }
  });

  try {
    const enriched = await prisma.album.findMany({
      where: { enrichmentStatus: "enriched", NOT: { lastFmTags: undefined } },
      select: { id: true, title: true, artist: true, lastFmTags: true },
      take: BATCH
    });

    console.log(`[EMBED] Processing ${enriched.length} enriched albums (batch=${BATCH})`);

    const dimIds = await getDimensionIds();
    if (dimIds.size < 7) {
      throw new Error("Dimensions not seeded in DB. Run the dimension seeder first.");
    }

    let embedded = 0;
    let failed = 0;

    for (const album of enriched) {
      try {
        const tags = album.lastFmTags as unknown as ParsedLastfmTag[];
        if (!tags || tags.length === 0) {
          await prisma.album.update({ where: { id: album.id }, data: { enrichmentStatus: "failed" } });
          failed++;
          continue;
        }

        const classified = tagClassifierService.classify(tags);
        const fusionResult = await signalFusionService.fuseSignals({
          emotionalTags: classified.emotional,
          genreTags: classified.genre,
          artistName: album.artist
        });

        if (!fusionResult.embedding) {
          await prisma.album.update({ where: { id: album.id }, data: { enrichmentStatus: "failed" } });
          failed++;
          continue;
        }

        const vec = fusionResult.embedding;

        for (const dim of DIMS) {
          const dimensionId = dimIds.get(dim);
          if (!dimensionId) continue;
          await prisma.albumIntrinsicProfileDimension.upsert({
            where: { albumId_dimensionId: { albumId: album.id, dimensionId } },
            update: { value: vec[dim] },
            create: { albumId: album.id, dimensionId, value: vec[dim] }
          });
        }

        await prisma.album.update({
          where: { id: album.id },
          data: {
            enrichmentStatus: "embedded",
            embeddingComputedAt: new Date(),
            embeddingConfidence: fusionResult.confidence,
            embeddingDerivedFrom: "lastfmTags"
          }
        });
        embedded++;
      } catch (err: any) {
        console.warn(`[EMBED] Failed "${album.title}" by ${album.artist}: ${err.message}`);
        await prisma.album.update({
          where: { id: album.id },
          data: { enrichmentStatus: "failed" }
        }).catch(() => {});
        failed++;
      }
    }

    console.log(`[EMBED] ✓ Embedded ${embedded}, failed ${failed}`);

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        targetCount: enriched.length,
        processedCount: embedded,
        result: { embedded, failed }
      }
    });
  } catch (err: any) {
    console.error("[EMBED] ❌ Failed:", err.message);
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: err.message }
    });
  } finally {
    await prisma.$disconnect();
  }
}

run();
