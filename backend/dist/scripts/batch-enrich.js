#!/usr/bin/env ts-node
"use strict";
/**
 * BATCH ENRICHMENT CLI SCRIPT
 *
 * Re-enriches existing album embeddings with Last.fm tags.
 *
 * USE CASES:
 * - Backfill enrichment for albums that were "audio-only"
 * - Manual recovery if Last.fm was temporarily down
 * - Periodic re-enrichment as Last.fm tags evolve
 *
 * USAGE:
 * ```bash
 * npx ts-node src/scripts/batch-enrich.ts
 * ```
 *
 * EXPECTED OUTPUT:
 * [BATCH-ENRICH] Starting enrichment process...
 * [BATCH-ENRICH] Found 150 albums to process
 * [1/150] Enriching: Album Name
 * [BATCH-ENRICH] ✓ Enriched: Album Name (was audio-only → enriched)
 * ...
 * [BATCH-ENRICH] ─────────────────────────────────────────
 * [BATCH-ENRICH] Enrichment complete:
 * [BATCH-ENRICH]   Processed: 150
 * [BATCH-ENRICH]   Enriched: 45
 * [BATCH-ENRICH]   Skipped (already enriched): 100
 * [BATCH-ENRICH]   Failed: 5
 * [BATCH-ENRICH] ─────────────────────────────────────────
 *
 * @module scripts/batch-enrich
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const lastfm_client_1 = require("../utils/lastfm-client");
const album_enrichment_service_1 = require("../services/album/album-enrichment.service");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
/**
 * Main entry point
 * Batch enrich all albums
 */
async function main() {
    try {
        console.log("\n🎵 Starting batch enrichment process...\n");
        const startTime = Date.now();
        // STEP 1: Fetch all embeddings from database
        console.log("[BATCH-ENRICH] Fetching all embeddings from database...");
        const embeddings = await prisma.albumEmotionalEmbedding.findMany({
            select: {
                id: true,
                spotifyAlbumId: true,
                albumName: true,
                artist: true,
                enrichmentStatus: true,
                valence: true,
                arousal: true,
                tension: true,
                warmth: true,
                intimacy: true,
                density: true,
                spaciousness: true,
                organicSynthetic: true,
                nostalgia: true,
                groundedness: true,
                introspection: true,
                movement: true,
            }
        });
        console.log(`[BATCH-ENRICH] Found ${embeddings.length} embeddings to process`);
        const stats = {
            processed: 0,
            enriched: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };
        // STEP 2: For each embedding, try to enrich
        for (let i = 0; i < embeddings.length; i++) {
            const embedding = embeddings[i];
            const progress = `[${i + 1}/${embeddings.length}]`;
            // Skip if already enriched
            if (embedding.enrichmentStatus === "enriched") {
                console.log(`${progress} ○ Skipped (already enriched): ${embedding.albumName}`);
                stats.skipped++;
                stats.processed++;
                continue;
            }
            try {
                console.log(`${progress} Enriching: ${embedding.albumName}`);
                // Fetch tags from Last.fm
                let tags = await lastfm_client_1.lastfmClient.fetchAlbumTags(embedding.artist || "", embedding.albumName || "");
                if (tags.length === 0 && embedding.artist) {
                    tags = await lastfm_client_1.lastfmClient.fetchArtistTags(embedding.artist);
                }
                // Construct base embedding (7D only - schema has old 13D columns but we only use 7D now)
                const baseEmbedding = {
                    valence: embedding.valence,
                    arousal: embedding.arousal,
                    tension: embedding.tension,
                    warmth: embedding.warmth,
                    intimacy: embedding.intimacy,
                    density: embedding.density,
                    groundedness: embedding.groundedness,
                };
                // Enrich
                const enrichmentResult = await album_enrichment_service_1.albumEnrichmentService.enrichEmbedding(baseEmbedding, tags);
                // Update database (write all 13D columns for schema compatibility)
                await prisma.albumEmotionalEmbedding.update({
                    where: { id: embedding.id },
                    data: {
                        valence: enrichmentResult.embedding.valence,
                        arousal: enrichmentResult.embedding.arousal,
                        tension: enrichmentResult.embedding.tension,
                        warmth: enrichmentResult.embedding.warmth,
                        intimacy: enrichmentResult.embedding.intimacy,
                        density: enrichmentResult.embedding.density,
                        // DEPRECATED: Set old columns to defaults for schema compatibility
                        spaciousness: 0.5,
                        organicSynthetic: 0.5,
                        nostalgia: 0.5,
                        introspection: 0.5,
                        movement: 0.5,
                        groundedness: enrichmentResult.embedding.groundedness,
                        tags: tags.length > 0 ? JSON.parse(JSON.stringify(tags)) : undefined,
                        enrichmentStatus: enrichmentResult.enrichmentStatus,
                    }
                });
                const oldStatus = embedding.enrichmentStatus || "pending";
                const newStatus = enrichmentResult.enrichmentStatus;
                console.log(`${progress} ✓ Enriched: ${embedding.albumName} (${oldStatus} → ${newStatus})`);
                if (newStatus === "enriched") {
                    stats.enriched++;
                }
                stats.processed++;
            }
            catch (error) {
                stats.failed++;
                const errorMsg = `Failed to enrich ${embedding.albumName}: ${error.message}`;
                stats.errors.push(errorMsg);
                console.warn(`${progress} ✗ ${errorMsg}`);
            }
        }
        // STEP 3: Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log("\n[BATCH-ENRICH] ─────────────────────────────────────────");
        console.log(`[BATCH-ENRICH] Enrichment complete in ${duration}s:`);
        console.log(`[BATCH-ENRICH]   Processed: ${stats.processed}`);
        console.log(`[BATCH-ENRICH]   Enriched: ${stats.enriched}`);
        console.log(`[BATCH-ENRICH]   Skipped (already enriched): ${stats.skipped}`);
        console.log(`[BATCH-ENRICH]   Failed: ${stats.failed}`);
        if (stats.errors.length > 0) {
            console.log(`[BATCH-ENRICH] Errors:`);
            stats.errors.slice(0, 5).forEach(err => console.log(`[BATCH-ENRICH]   - ${err}`));
            if (stats.errors.length > 5) {
                console.log(`[BATCH-ENRICH]   ... and ${stats.errors.length - 5} more`);
            }
        }
        console.log("[BATCH-ENRICH] ─────────────────────────────────────────\n");
        // Exit with appropriate code
        process.exit(stats.failed === 0 ? 0 : 1);
    }
    catch (error) {
        console.error("\n❌ Batch enrichment process failed:");
        console.error(error.message);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run main
main();
