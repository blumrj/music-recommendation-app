/**
 * Catalog Enrich Worker
 *
 * For every Album with enrichmentStatus = 'pending', fetches Last.fm tags
 * and persists them to Album.lastFmTags. Sets status to 'enriched'.
 *
 * Run: npx ts-node src/workers/catalog/enrich.ts [--batch 50]
 */

import "../env";
import { PrismaClient } from "@prisma/client";
import { lastfmClient } from "../../infrastructure/lastfm/lastfm-client";

const prisma = new PrismaClient();
const BATCH = parseInt(process.argv.find(a => a.startsWith("--batch="))?.split("=")[1] ?? "50");

async function run() {
  const job = await prisma.processingJob.create({
    data: { jobType: "enrich", status: "running", startedAt: new Date() }
  });

  try {
    const pending = await prisma.album.findMany({
      where: { enrichmentStatus: "pending" },
      select: { id: true, title: true, artist: true },
      take: BATCH
    });

    console.log(`[ENRICH] Processing ${pending.length} pending albums (batch=${BATCH})`);

    let enriched = 0;
    let failed = 0;

    for (const album of pending) {
      try {
        let tags = await lastfmClient.fetchAlbumTags(album.artist, album.title);

        if (tags.length === 0) {
          tags = await lastfmClient.fetchArtistTags(album.artist);
        }

        if (tags.length === 0) {
          await prisma.album.update({
            where: { id: album.id },
            data: { enrichmentStatus: "failed" }
          });
          failed++;
          continue;
        }

        await prisma.album.update({
          where: { id: album.id },
          data: {
            lastFmTags: tags as any,
            enrichmentStatus: "enriched"
          }
        });
        enriched++;
      } catch (err: any) {
        console.warn(`[ENRICH] Failed "${album.title}" by ${album.artist}: ${err.message}`);
        await prisma.album.update({
          where: { id: album.id },
          data: { enrichmentStatus: "failed" }
        }).catch(() => {});
        failed++;
      }
    }

    console.log(`[ENRICH] ✓ Enriched ${enriched}, failed ${failed}`);

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        targetCount: pending.length,
        processedCount: enriched,
        result: { enriched, failed }
      }
    });
  } catch (err: any) {
    console.error("[ENRICH] ❌ Failed:", err.message);
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: err.message }
    });
  } finally {
    await prisma.$disconnect();
  }
}

run();
