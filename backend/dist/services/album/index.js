"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumClusteringService = exports.albumEnrichmentService = exports.albumEmbeddingService = exports.albumService = void 0;
var albums_service_1 = require("./albums.service");
Object.defineProperty(exports, "albumService", { enumerable: true, get: function () { return albums_service_1.albumService; } });
var album_embedding_service_1 = require("./album-embedding.service");
Object.defineProperty(exports, "albumEmbeddingService", { enumerable: true, get: function () { return album_embedding_service_1.albumEmbeddingService; } });
var album_enrichment_service_1 = require("./album-enrichment.service");
Object.defineProperty(exports, "albumEnrichmentService", { enumerable: true, get: function () { return album_enrichment_service_1.albumEnrichmentService; } });
var album_clustering_service_1 = require("./album-clustering.service");
Object.defineProperty(exports, "albumClusteringService", { enumerable: true, get: function () { return album_clustering_service_1.albumClusteringService; } });
