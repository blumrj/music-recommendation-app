/**
 * Catalog Pipeline Runner
 *
 * Orchestrates the full discover → enrich → embed pipeline.
 *
 * Usage:
 *   npx ts-node src/workers/run-catalog.ts [artist1] [artist2] ...
 *
 * Options (set as env vars or defaults apply):
 *   ENRICH_BATCH=50   Albums per enrich run (default 50)
 *   EMBED_BATCH=100   Albums per embed run (default 100)
 *   ENRICH_ROUNDS=3   How many enrich+embed rounds to run (default 3)
 *
 * Discovery is fully automatic — genre/mood tags from the codebase config
 * are used as seeds, requiring no user data or manual input.
 */

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import path from "path";

const prisma = new PrismaClient();
const ENRICH_BATCH = parseInt(process.env.ENRICH_BATCH ?? "50");
const EMBED_BATCH = parseInt(process.env.EMBED_BATCH ?? "100");
const ENRICH_ROUNDS = parseInt(process.env.ENRICH_ROUNDS ?? "3");

const WORKER_DIR = path.join(__dirname, "catalog");
const TS_NODE = path.join(__dirname, "..", "..", "node_modules", ".bin", "ts-node");

function runScript(script: string, extraArgs: string[] = []) {
  const cmd = `"${TS_NODE}" "${script}" ${extraArgs.join(" ")}`;
  console.log(`\n[RUN] ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: path.join(__dirname, "..", "..") });
}

async function countByStatus() {
  const counts = await prisma.album.groupBy({
    by: ["enrichmentStatus"],
    _count: { id: true }
  });
  return Object.fromEntries(counts.map(c => [c.enrichmentStatus ?? "null", c._count.id]));
}

async function main() {
  console.log("═".repeat(60));
  console.log(" CATALOG PIPELINE START");
  console.log("═".repeat(60));

  const seedArgs = process.argv.slice(2);

  // ── Step 1: Discover ──────────────────────────────────────────
  console.log("\n── STEP 1: DISCOVER ──");
  runScript(path.join(WORKER_DIR, "discover.ts"), seedArgs);

  const afterDiscover = await countByStatus();
  console.log("\n[STATUS] After discover:", afterDiscover);

  // ── Step 2–3: Enrich + Embed (multiple rounds) ───────────────
  for (let round = 1; round <= ENRICH_ROUNDS; round++) {
    console.log(`\n── STEP 2 (round ${round}/${ENRICH_ROUNDS}): ENRICH ──`);
    runScript(path.join(WORKER_DIR, "enrich.ts"), [`--batch=${ENRICH_BATCH}`]);

    console.log(`\n── STEP 3 (round ${round}/${ENRICH_ROUNDS}): EMBED ──`);
    runScript(path.join(WORKER_DIR, "embed.ts"), [`--batch=${EMBED_BATCH}`]);

    const status = await countByStatus();
    console.log(`\n[STATUS] After round ${round}:`, status);

    const pendingLeft = (status["pending"] ?? 0) + (status["enriched"] ?? 0);
    if (pendingLeft === 0) {
      console.log("[RUN] No more albums to process. Stopping early.");
      break;
    }
  }

  const final = await countByStatus();
  console.log("\n═".repeat(60));
  console.log(" CATALOG PIPELINE COMPLETE");
  console.log(` embedded: ${final["embedded"] ?? 0}`);
  console.log(` pending:  ${final["pending"] ?? 0}`);
  console.log(` enriched: ${final["enriched"] ?? 0}`);
  console.log(` failed:   ${final["failed"] ?? 0}`);
  console.log("═".repeat(60));

  await prisma.$disconnect();
}

main().catch(async err => {
  console.error("[RUN] ❌", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
