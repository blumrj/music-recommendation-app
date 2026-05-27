#!/usr/bin/env ts-node
/**
 * BATCH EMBEDDING CLI SCRIPT
 * 
 * Pre-computes 13D embeddings for all albums in the database.
 * 
 * USAGE:
 * ```bash
 * npx ts-node admin-scripts/batch-embed.ts
 * ```
 * 
 * EXPECTED OUTPUT:
 * [BATCH] Starting batch embedding for all albums...
 * [BATCH] Fetching all albums from database...
 * [BATCH] Found 150 unique albums
 * [BATCH] Processing albums...
 * [1/150] ✓ Created: Album Name
 * [2/150] ○ Cached: Another Album
 * ...
 * [BATCH] ─────────────────────────────────────────
 * [BATCH] Batch complete:
 * [BATCH]   Processed: 150
 * [BATCH]   Created:   120
 * [BATCH]   Cached:    30
 * [BATCH]   Failed:    0
 * [BATCH] ─────────────────────────────────────────
 * 
 * @module admin-scripts/batch-embed
 */

import { batchEmbeddingService } from "../src/admin/batch-embedding.service";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Main entry point
 * Run the batch embedding process and exit
 */
async function main() {
  try {
    console.log("🎵 Starting album embedding batch process...\n");
    
    const startTime = Date.now();
    const stats = await batchEmbeddingService.batchEmbedAllAlbums();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Batch process completed in ${duration}s\n`);
    
    // Exit with appropriate code
    process.exit(stats.failed === 0 ? 0 : 1);
  } catch (error: any) {
    console.error("\n❌ Batch process failed:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run main
main();
