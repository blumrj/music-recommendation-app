/**
 * Album Services Index
 * 
 * Central export point for all album-related services.
 * 
 * Services:
 * - albumService: Core favorites & persistence
 * - albumEmbeddingService: 13D emotional embeddings from audio features
 * - albumEnrichmentService: Tag-based enrichment
 * - albumClusteringService: K-means clustering for survey selection
 */

export { albumService } from "./albums.service";
export { albumEmbeddingService } from "./album-embedding.service";
export { albumEnrichmentService } from "./album-enrichment.service";
export { albumClusteringService } from "./album-clustering.service";
