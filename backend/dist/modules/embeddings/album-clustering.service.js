"use strict";
/**
 * ALBUM CLUSTERING SERVICE - PHASE 0
 *
 * Intelligently selects survey albums by clustering user's library
 * into emotionally-diverse groups.
 *
 * ALGORITHM: K-means clustering in 13D emotional space
 * - Cluster user's saved albums into 5 emotional groups
 * - Select 1-2 "anchor albums" per cluster (closest to centroid)
 * - Return anchors for survey (ensures emotional coverage)
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumClusteringService = void 0;
const vectorMath = __importStar(require("../../utils/vector-math"));
const album_embedding_orchestrator_1 = require("./album-embedding.orchestrator");
class AlbumClusteringService {
    constructor() {
        this.K_CLUSTERS = 5;
        this.MAX_ITERATIONS = 100;
        this.CONVERGENCE_THRESHOLD = 0.001;
    }
    /**
     * Select emotionally-diverse survey albums using k-means clustering
     * Uses Last.fm tag-based embeddings (no Spotify API calls)
     *
     * @async
     * @param userAlbums - User's saved albums from Spotify
     */
    async selectSurveyAlbums(userAlbums) {
        console.log(`[CLUSTERING] Selecting survey albums from ${userAlbums.length} saved albums...`);
        try {
            // STEP 1: Get embeddings (via Last.fm tags, no Spotify calls)
            console.log(`[CLUSTERING] Computing embeddings for all albums...`);
            const albumsWithEmbeddings = await this.getAlbumEmbeddings(userAlbums);
            if (albumsWithEmbeddings.length === 0) {
                console.warn(`[CLUSTERING] No embeddings computed, returning shuffled albums`);
                return this.shuffleAndSelect(userAlbums, 10);
            }
            console.log(`[CLUSTERING] ✓ Got embeddings for ${albumsWithEmbeddings.length} albums`);
            // STEP 2: Cluster
            const clusters = await this.kMeansClustering(albumsWithEmbeddings);
            console.log(`[CLUSTERING] ✓ Clustered into ${clusters.length} groups`);
            // STEP 3: Select anchors
            const anchors = this.selectAnchors(clusters);
            console.log(`[CLUSTERING] ✓ Selected ${anchors.length} anchor albums`);
            if (anchors.length === 0) {
                console.warn(`[CLUSTERING] No anchors selected, returning shuffled albums`);
                return this.shuffleAndSelect(userAlbums, 10);
            }
            return anchors.map((album) => ({
                spotifyAlbumId: album.spotifyAlbumId,
                albumName: album.albumName,
                artist: album.artist,
                imageUrl: album.imageUrl
            }));
        }
        catch (error) {
            console.error(`[CLUSTERING] Error: ${error.message}`);
            return this.shuffleAndSelect(userAlbums, 10);
        }
    }
    /**
     * Shuffle array and return top N items for fallback
     */
    shuffleAndSelect(albums, count) {
        const shuffled = [...albums].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }
    async getAlbumEmbeddings(userAlbums) {
        const result = [];
        let successCount = 0;
        let failCount = 0;
        for (const album of userAlbums) {
            try {
                // Get embedding from Last.fm tags (no Spotify audio features needed)
                const embedding = await album_embedding_orchestrator_1.albumEmbeddingService.getOrComputeEmbedding({ albumName: album.albumName, artist: album.artist });
                // Log first few successful embeddings to verify they're different
                if (successCount < 3) {
                    console.log(`[CLUSTERING] Album ${successCount + 1}: ${album.albumName}`, {
                        valence: embedding.valence,
                        arousal: embedding.arousal,
                        warmth: embedding.warmth,
                        intimacy: embedding.intimacy
                    });
                }
                result.push({
                    spotifyAlbumId: album.spotifyAlbumId,
                    albumName: album.albumName,
                    artist: album.artist,
                    imageUrl: album.imageUrl,
                    embedding: {
                        valence: embedding.valence,
                        arousal: embedding.arousal,
                        tension: embedding.tension,
                        warmth: embedding.warmth,
                        intimacy: embedding.intimacy,
                        density: embedding.density,
                        groundedness: embedding.groundedness
                    }
                });
                successCount++;
            }
            catch (error) {
                failCount++;
                console.warn(`[CLUSTERING] Failed to get embedding for ${album.albumName}: ${error.message}`);
            }
        }
        console.log(`[CLUSTERING] Embedding results: ${successCount} success, ${failCount} failed`);
        if (successCount === 0) {
            console.error(`[CLUSTERING] ⚠️  NO embeddings computed! This will result in poor clustering.`);
        }
        return result;
    }
    async kMeansClustering(albums) {
        const k = Math.min(this.K_CLUSTERS, Math.max(2, albums.length));
        console.log(`[CLUSTERING] Starting k-means with k=${k} for ${albums.length} albums`);
        let centroids = this.initializeCentroids(albums, k);
        let iteration = 0;
        let converged = false;
        // Log initial centroids variance to detect if all embeddings are identical
        const centroidVariances = this.computeCentroidVariances(centroids);
        console.log(`[CLUSTERING] Initial centroid variance:`, {
            avgDist: centroidVariances.averageDistance.toFixed(4),
            maxDist: centroidVariances.maxDistance.toFixed(4)
        });
        while (iteration < this.MAX_ITERATIONS && !converged) {
            const clusters = this.assignToClusters(albums, centroids);
            const newCentroids = clusters.map((c) => this.computeCentroid(c.albums));
            const movement = this.computeTotalMovement(centroids, newCentroids);
            if (iteration % 5 === 0 || iteration < 3) {
                console.log(`[CLUSTERING] Iteration ${iteration}: clusters:`, clusters.map(c => c.albums.length).join(","), `movement: ${movement.toFixed(6)}`);
            }
            converged = movement < this.CONVERGENCE_THRESHOLD;
            centroids = newCentroids;
            iteration++;
        }
        console.log(`[CLUSTERING] Converged after ${iteration} iterations`);
        const finalClusters = this.assignToClusters(albums, centroids);
        console.log(`[CLUSTERING] Final cluster sizes:`, finalClusters.map(c => c.albums.length).join(","));
        return finalClusters;
    }
    computeTotalMovement(oldCentroids, newCentroids) {
        let totalMove = 0;
        for (let i = 0; i < oldCentroids.length; i++) {
            totalMove += vectorMath.euclideanDistance(oldCentroids[i], newCentroids[i]);
        }
        return totalMove / oldCentroids.length;
    }
    computeCentroidVariances(centroids) {
        let totalDist = 0;
        let maxDist = 0;
        for (let i = 0; i < centroids.length; i++) {
            for (let j = i + 1; j < centroids.length; j++) {
                const dist = vectorMath.euclideanDistance(centroids[i], centroids[j]);
                totalDist += dist;
                maxDist = Math.max(maxDist, dist);
            }
        }
        const numPairs = (centroids.length * (centroids.length - 1)) / 2;
        return {
            averageDistance: numPairs > 0 ? totalDist / numPairs : 0,
            maxDistance: maxDist
        };
    }
    initializeCentroids(albums, k) {
        const centroids = [];
        const indices = new Set();
        while (centroids.length < k && centroids.length < albums.length) {
            const idx = Math.floor(Math.random() * albums.length);
            if (!indices.has(idx)) {
                centroids.push(albums[idx].embedding);
                indices.add(idx);
            }
        }
        return centroids;
    }
    assignToClusters(albums, centroids) {
        const clusters = centroids.map((centroid, id) => ({
            clusterId: id,
            centroid,
            albums: []
        }));
        for (const album of albums) {
            let nearest = 0;
            let minDist = Infinity;
            for (let i = 0; i < centroids.length; i++) {
                const dist = vectorMath.euclideanDistance(album.embedding, centroids[i]);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = i;
                }
            }
            clusters[nearest].albums.push(album);
        }
        return clusters;
    }
    computeCentroid(albums) {
        if (albums.length === 0) {
            return {
                valence: 0.5,
                arousal: 0.5,
                tension: 0.5,
                warmth: 0.5,
                intimacy: 0.5,
                density: 0.5,
                groundedness: 0.5
            };
        }
        return vectorMath.averageVectors(albums.map((a) => a.embedding));
    }
    selectAnchors(clusters) {
        const anchors = [];
        for (const cluster of clusters) {
            if (cluster.albums.length === 0)
                continue;
            // Sort albums by distance to centroid
            const sorted = cluster.albums
                .map((a) => ({
                album: a,
                dist: vectorMath.euclideanDistance(a.embedding, cluster.centroid)
            }))
                .sort((a, b) => a.dist - b.dist);
            // Select 1 or 2 closest albums from this cluster
            const count = cluster.albums.length < 3 ? 1 : Math.min(2, sorted.length);
            console.log(`[CLUSTERING] Cluster ${cluster.clusterId}: ${cluster.albums.length} albums → selecting ${count}`);
            for (let i = 0; i < count && i < sorted.length; i++) {
                const selected = sorted[i].album;
                console.log(`[CLUSTERING]   - ${selected.albumName} (distance: ${sorted[i].dist.toFixed(4)})`);
                anchors.push(selected);
            }
        }
        console.log(`[CLUSTERING] Total anchors selected: ${anchors.length}`);
        return anchors;
    }
}
exports.albumClusteringService = new AlbumClusteringService();
//# sourceMappingURL=album-clustering.service.js.map