"use strict";
/**
 * ARTIST EMBEDDING SERVICE
 *
 * Computes and caches artist-level embeddings by aggregating their album embeddings.
 *
 * RESPONSIBILITY:
 * - Query all albums by artist from database
 * - Average their 13D embeddings
 * - Cache result to avoid repeated queries
 * - Calculate confidence based on album count (more albums = more stable signal)
 * - Provide graceful fallback for new artists or DB errors
 *
 * PHILOSOPHY:
 * - Artist embeddings stabilize sparse album data
 * - Cached for performance (TTL: 24 hours)
 * - Confidence grows with artist catalog size (but capped)
 * - Never fails: returns null on error instead of throwing
 *
 * @category Services
 * @module services/artist-embedding
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
exports.artistEmbeddingService = void 0;
const client_1 = require("@prisma/client");
const vectorMath = __importStar(require("../utils/vector-math"));
const prisma = new client_1.PrismaClient();
/**
 * Artist Embedding Service
 *
 * Manages artist-level embeddings via aggregation + caching
 */
class ArtistEmbeddingService {
    constructor() {
        // LRU cache: Map<artistName, CachedArtistEmbedding>
        this.cache = new Map();
        // Cache TTL: 24 hours in milliseconds
        this.CACHE_TTL_MS = 24 * 60 * 60 * 1000;
        // Maximum cache size (prevent unbounded memory growth)
        this.MAX_CACHE_SIZE = 500;
    }
    /**
     * Get or compute artist embedding
     *
     * First checks cache, then queries DB if needed.
     * Returns null if artist has no albums or DB error occurs.
     *
     * @async
     * @param artistName - Artist name (from album metadata)
     * @returns { embedding, confidence, albumCount } or null if unavailable
     */
    async getOrComputeArtistEmbedding(artistName) {
        if (!artistName || artistName.trim().length === 0) {
            console.log(`[ARTIST-EMBEDDING] Invalid artist name`);
            return null;
        }
        const normalizedName = artistName.toLowerCase().trim();
        // Check cache
        const cached = this.getFromCache(normalizedName);
        if (cached) {
            console.log(`[ARTIST-EMBEDDING] ✓ Cache hit for artist: ${artistName} (${cached.albumCount} albums, conf: ${cached.confidence.toFixed(2)})`);
            return {
                embedding: cached.embedding,
                confidence: cached.confidence,
                albumCount: cached.albumCount
            };
        }
        // Cache miss: compute from DB
        try {
            const result = await this.computeArtistAverage(normalizedName, artistName);
            if (!result) {
                console.log(`[ARTIST-EMBEDDING] ✗ No albums found for artist: ${artistName}`);
                return null;
            }
            // Store in cache
            this.setInCache(normalizedName, result);
            console.log(`[ARTIST-EMBEDDING] ✓ Computed for artist: ${artistName} (${result.albumCount} albums, conf: ${result.confidence.toFixed(2)})`);
            return {
                embedding: result.embedding,
                confidence: result.confidence,
                albumCount: result.albumCount
            };
        }
        catch (error) {
            console.error(`[ARTIST-EMBEDDING] Error computing embedding for ${artistName}:`, error.message);
            return null; // Graceful fallback
        }
    }
    /**
     * Compute average embedding from all albums by artist
     *
     * ALGORITHM:
     * 1. Query DB: SELECT * FROM AlbumEmotionalEmbedding WHERE artist = ?
     * 2. Filter: only include embeddings with confidence > 0 (valid embeddings)
     * 3. Average all 13D vectors
     * 4. Calculate confidence: 0.4 + min(0.3, albumCount / 20)
     *    - Range: 0.4 (1 album) to 0.7 (20+ albums)
     * 5. Return { embedding, albumCount, confidence }
     *
     * @private
     * @async
     * @param normalizedName - Artist name (lowercase, trimmed)
     * @param originalName - Original artist name (for logging)
     * @returns Result or null if no albums found
     */
    async computeArtistAverage(normalizedName, originalName) {
        console.log(`[ARTIST-EMBEDDING] Querying DB for artist: ${originalName}`);
        try {
            // Query all albums by artist
            const albums = await prisma.albumEmotionalEmbedding.findMany({
                where: {
                    artist: {
                        equals: originalName,
                        mode: "insensitive" // Case-insensitive matching
                    }
                },
                select: {
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
                    confidence: true
                }
            });
            if (albums.length === 0) {
                return null;
            }
            // Filter: only include embeddings with confidence > 0
            const validAlbums = albums.filter(a => (a.confidence ?? 0) > 0);
            if (validAlbums.length === 0) {
                console.log(`[ARTIST-EMBEDDING] Found ${albums.length} albums but none have valid confidence`);
                return null;
            }
            console.log(`[ARTIST-EMBEDDING] Found ${validAlbums.length} valid albums (of ${albums.length} total)`);
            // Average all embeddings
            const averaged = vectorMath.averageVectors(validAlbums.map(album => ({
                valence: album.valence,
                arousal: album.arousal,
                tension: album.tension,
                warmth: album.warmth,
                intimacy: album.intimacy,
                density: album.density,
                spaciousness: album.spaciousness,
                organicSynthetic: album.organicSynthetic,
                nostalgia: album.nostalgia,
                groundedness: album.groundedness,
                introspection: album.introspection,
                movement: album.movement
            })));
            // Calculate confidence: more albums = more stable signal
            // confidence = 0.4 + min(0.3, albumCount / 20)
            // Range: 0.4 (1 album) to 0.7 (20+ albums)
            const confidence = 0.4 + Math.min(0.3, validAlbums.length / 20);
            return {
                embedding: averaged,
                albumCount: validAlbums.length,
                confidence
            };
        }
        catch (error) {
            console.error(`[ARTIST-EMBEDDING] DB query error:`, error.message);
            return null;
        }
    }
    /**
     * Get from cache if valid (not expired)
     *
     * @private
     * @param normalizedName - Normalized artist name
     * @returns Cached result or null if not found/expired
     */
    getFromCache(normalizedName) {
        const cached = this.cache.get(normalizedName);
        if (!cached) {
            return null;
        }
        // Check if expired
        const ageMs = Date.now() - cached.timestamp;
        if (ageMs > this.CACHE_TTL_MS) {
            this.cache.delete(normalizedName);
            return null;
        }
        return cached;
    }
    /**
     * Store in cache with LRU eviction if needed
     *
     * @private
     * @param normalizedName - Normalized artist name
     * @param result - Embedding result to cache
     */
    setInCache(normalizedName, result) {
        // Evict oldest entry if cache is full
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
                console.log(`[ARTIST-EMBEDDING] Cache evicted oldest entry (size: ${this.cache.size}/${this.MAX_CACHE_SIZE})`);
            }
        }
        this.cache.set(normalizedName, {
            embedding: result.embedding,
            albumCount: result.albumCount,
            confidence: result.confidence,
            timestamp: Date.now()
        });
    }
    /**
     * Clear all cached artist embeddings
     * (Useful for manual cache invalidation or testing)
     */
    clearCache() {
        this.cache.clear();
        console.log(`[ARTIST-EMBEDDING] Cache cleared`);
    }
    /**
     * Get cache statistics for debugging
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.MAX_CACHE_SIZE,
            entries: Array.from(this.cache.keys())
        };
    }
    /**
     * Manually refresh cache entry for artist
     * (Useful if artist albums were recently added to DB)
     *
     * @async
     * @param artistName - Artist name to refresh
     */
    async refreshCacheEntry(artistName) {
        const normalizedName = artistName.toLowerCase().trim();
        this.cache.delete(normalizedName); // Remove from cache
        console.log(`[ARTIST-EMBEDDING] Cache invalidated for artist: ${artistName}`);
    }
}
// Export singleton instance
exports.artistEmbeddingService = new ArtistEmbeddingService();
