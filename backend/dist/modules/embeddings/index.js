"use strict";
/**
 * Embeddings Module
 * Handles all embedding computation and orchestration
 *
 * Public Exports:
 * - albumEmbeddingOrchestrator: Main orchestrator for album embeddings
 * - Supporting embedding services (semantic-similarity, tag-embedding, signal-fusion)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumEmbeddingService = void 0;
var album_embedding_orchestrator_1 = require("./album-embedding.orchestrator");
Object.defineProperty(exports, "albumEmbeddingService", { enumerable: true, get: function () { return album_embedding_orchestrator_1.albumEmbeddingService; } });
__exportStar(require("./semantic-similarity.service"), exports);
__exportStar(require("./tag-embedding.service"), exports);
__exportStar(require("./signal-fusion.service"), exports);
__exportStar(require("./album-enrichment.service"), exports);
__exportStar(require("./album-clustering.service"), exports);
__exportStar(require("./artist-embedding.service"), exports);
__exportStar(require("./tag-classifier.service"), exports);
