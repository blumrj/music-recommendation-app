/**
 * Embeddings Module
 * Handles all embedding computation and orchestration
 * 
 * Public Exports:
 * - albumEmbeddingOrchestrator: Main orchestrator for album embeddings
 * - Supporting embedding services (semantic-similarity, tag-embedding, signal-fusion)
 */

export { albumEmbeddingService } from "./album-embedding.orchestrator";
export * from "./semantic-similarity.service";
export * from "./tag-embedding.service";
export * from "./signal-fusion.service";
export * from "./album-enrichment.service";
export * from "./album-clustering.service";
export * from "./artist-embedding.service";
export * from "./tag-classifier.service";
