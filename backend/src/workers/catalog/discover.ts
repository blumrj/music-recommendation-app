/**
 * Catalog Discover Worker
 *
 * Discovers albums by querying Last.fm's top albums per genre/mood tag.
 * Tags are sourced from two lists that together cover all 7 emotional dimensions:
 *   - Genre tags: all keys from genrePriors (~42 genres)
 *   - Mood tags: emotional descriptors ("melancholic", "dreamy", etc.)
 *
 * This worker is fully independent of any user data — it can run on a fresh DB.
 *
 * Run: npx ts-node src/workers/catalog/discover.ts [--albums-per-tag=N]
 */

import { PrismaClient } from "@prisma/client";
import { lastfmDiscoveryService } from "../../modules/discovery/lastfm-discovery.service";
import { getAllGenres } from "../../config/genre-priors";

const prisma = new PrismaClient();
const ALBUMS_PER_TAG = parseInt(
  process.argv.find(a => a.startsWith("--albums-per-tag="))?.split("=")[1] ?? "5"
);

// Mood/emotional tags not already covered by genre priors
const MOOD_TAGS = [
  "dream pop", "ethereal", "dreamy",
  "slowcore", "sad", "melancholic", "introspective", "intimate",
  "acoustic", "singer-songwriter", "organic",
  "experimental electronic", "electroacoustic", "minimal",
  "dynamic", "atmospheric"
];

function buildTagList(): string[] {
  const genres = getAllGenres(); // ~42 genre keys from genrePriors
  const all = [...genres, ...MOOD_TAGS];
  // Deduplicate (some mood tags may overlap with genre keys)
  return [...new Set(all)];
}

async function run() {
  const job = await prisma.processingJob.create({
    data: { jobType: "discover", status: "running", startedAt: new Date() }
  });

  try {
    const tags = buildTagList();
    console.log(`[DISCOVER] Querying ${tags.length} tags (${ALBUMS_PER_TAG} albums/tag)...`);

    // Fetch top albums per tag — uses lastfmClient.getTopAlbumsByTag internally
    const raw = await lastfmDiscoveryService.expandByTags(tags, ALBUMS_PER_TAG);
    console.log(`[DISCOVER] Got ${raw.length} raw candidates from Last.fm`);

    // In-memory dedup by (title, artist)
    const seen = new Set<string>();
    const unique = raw.filter(c => {
      const key = `${c.albumName.trim().toLowerCase()}|${c.artist.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    console.log(`[DISCOVER] ${unique.length} unique candidates after dedup`);

    let created = 0;
    let skipped = 0;

    for (const c of unique) {
      try {
        const titleNorm = c.albumName.trim().toLowerCase();
        const artistNorm = c.artist.trim().toLowerCase();

        // Skip if already in DB
        const existing = await prisma.album.findFirst({
          where: {
            title: { equals: titleNorm, mode: "insensitive" },
            artist: { equals: artistNorm, mode: "insensitive" }
          }
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.album.create({
          data: {
            title: c.albumName,
            artist: c.artist,
            imageUrl: c.imageUrl || null,
            enrichmentStatus: "pending",
            lastDiscoveredAt: new Date(),
            externalIds: {
              create: {
                provider: "lastfm",
                externalId: `${artistNorm}::${titleNorm}`
              }
            }
          }
        });
        created++;
      } catch (err: any) {
        console.warn(`[DISCOVER] Skipping "${c.albumName}" by ${c.artist}: ${err.message}`);
      }
    }

    console.log(`[DISCOVER] ✓ Created ${created} new albums, skipped ${skipped} duplicates`);

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        processedCount: created,
        result: { discovered: created, skipped }
      }
    });
  } catch (err: any) {
    console.error("[DISCOVER] ❌ Failed:", err.message);
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { status: "failed", completedAt: new Date(), errorMessage: err.message }
    });
  } finally {
    await prisma.$disconnect();
  }
}

run();
