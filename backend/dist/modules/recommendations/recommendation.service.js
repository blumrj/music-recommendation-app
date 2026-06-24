"use strict";
/**
 * Recommendation Service - TWO-STAGE ALGORITHM (PHASE 4)
 *
 * CORE ARCHITECTURE:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Instead of returning top-K from one source, we use a TWO-STAGE pipeline:
 *
 *   STAGE 1: CANDIDATE GENERATION (~50 albums)
 *   ────────────────────────────────────────
 *   Get diverse candidates from multiple sources:
 *   - Content-based: Albums similar in 13D space
 *   - Collaborative: Albums liked by similar users
 *   - Diversity: Different genres, different artists
 *   - Previous: Albums from past recommendations
 *
 *   STAGE 2: MULTI-FACTOR RANKING (Return top 10)
 *   ──────────────────────────────────────────────
 *   Score each candidate using 2 factors:
 *   - 90% Emotional Similarity (7D cosine similarity to user state)
 *   - 10% Diversity (artist variety penalty during selection)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * BENEFITS OF 2-FACTOR MODEL:
 * ✓ Diverse candidates = more exploration (not just similar to seed)
 * ✓ Multi-factor ranking = emotional matching + artist variety
 * ✓ Always fresh = no stale cached results (recomputes per request)
 * ✓ Simpler algorithm = easier to debug and maintain
 * ✓ Diversity penalty = prevents artist over-representation
 *
 * FORMULA - Emotional Similarity + Diversity:
 * ────────────────────────────────────────────
 *   Score = (0.90 × emotionalSim) +
 *           (0.10 × diversityScore)
 *
 * Where:
 *   emotionalSim   ∈ [0,1]  (cosine similarity to user state)
 *   diversityScore ∈ [0,1]  (penalized by artist frequency in results)
 *
 * @category Services
 * @module services/recommendation
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationService = void 0;
const client_1 = require("@prisma/client");
const album_embedding_orchestrator_1 = require("../embeddings/album-embedding.orchestrator");
const albums_service_1 = require("./albums.service");
const candidate_pool_service_1 = require("../discovery/candidate-pool.service");
const weather_service_1 = require("../context/weather.service");
const users_service_1 = require("../users/users.service");
const logger_1 = require("../../shared/logger");
const vectorMath = __importStar(require("../../shared/math/vector"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
/**
 * Recommendation Service
 *
 * Orchestrates the complete recommendation pipeline from user taste + weather to album suggestions.
 *
 * @category Services
 * @class RecommendationService
 */
class RecommendationService {
    /**
     * Compute current user state: taste profile + context modifiers
     *
     *
     * @private
     * @param {Vector13D|null} userProfile - User's 13D taste profile (or null if new)
     * @param {Object} weatherContext - Weather context with modifier deltas
     *
     * @returns {Vector13D} Current user state in dimensions
     *
     * State = UserProfile + WeatherModifier
     *
     * - Context modifiers are soft adjustments [-0.3, +0.3] per dimension
     *
     * FALLBACK BEHAVIOR:
     * - If no user profile: start from neutral (0.5 all dims), apply weather
     * - If no weather context: return user profile as-is
     * - If both missing: return neutral profile
     *
     * @example
     * User profile: { valence: 0.7, arousal: 0.6, warmth: 0.4, ... }
     * Weather mod:  { warmth: +0.15, introspection: +0.20 }
     * Result:       { valence: 0.7, arousal: 0.6, warmth: 0.55, introspection: ...0.20+base... }
     */
    computeCurrentUserState(userProfile, weatherContext) {
        // Start with user profile or neutral
        const baseProfile = userProfile ?? vectorMath.createNeutralVector();
        // Apply weather context modifiers (additive, soft influence)
        if (weatherContext?.contextModifier) {
            logger_1.logger.info("STATE", `Weather modifier: arousal=${weatherContext.contextModifier.arousal}, valence=${weatherContext.contextModifier.valence}`);
            const result = vectorMath.addVectors(baseProfile, weatherContext.contextModifier);
            logger_1.logger.info("STATE", `After adding: arousal=${result.arousal.toFixed(3)} (was ${baseProfile.arousal.toFixed(3)})`);
            return result;
        }
        logger_1.logger.warn("STATE", `No weather modifier found in context`);
        return baseProfile;
    }
    // ═════════════════════════════════════════════════════════════════════════════════
    // PHASE 4: STAGE 2 - MULTI-FACTOR RANKING (Score and rank candidates)
    // ═════════════════════════════════════════════════════════════════════════════════
    /**
     * Compute diversity score (10% weight)
     *
     * Penalizes albums by artists already in top results
     * Encourages artist variety in final recommendations
     *
     * @private
     * @param {string} artist - Album's artist
     * @param {Array} selectedAlbums - Albums already selected
     *
     * @returns {number} Diversity score [0, 1]
     */
    computeDiversityScore(artist, selectedAlbums) {
        // Count how many times this artist appears in selected
        const artistCount = selectedAlbums.filter((a) => a.artist === artist).length;
        // Penalize by artist frequency: 1.0 if new, 0.5 if 1 already, 0.2 if 2+
        if (artistCount === 0)
            return 1.0;
        if (artistCount === 1)
            return 0.5;
        return 0.2;
    }
    /**
     * Score all album candidates using 2-factor model
     *
     * Computes embeddings and scores for each candidate in parallel:
     * - Emotional Similarity (90%)
     * - Returns composite score (diversity added during selection)
     *
     * @private
     * @async
     * @param {Array} candidates - Candidate albums to score
     * @param {Vector7D} userState - User's emotional state
     *
     * @returns {Promise<Array>} Scored albums with embedding and composite score
     */
    async scoreAlbumCandidates(candidates, userState) {
        logger_1.logger.info("RANK", `Scoring ${candidates.length} candidates with 2-factor model`);
        const scored = await Promise.all(candidates.map(async (album) => {
            try {
                // Compute 7D embedding for this album from Last.fm tags
                const embedding = await album_embedding_orchestrator_1.albumEmbeddingService.getOrComputeEmbedding({
                    albumName: album.albumName,
                    artist: album.artist,
                    imageUrl: album.imageUrl,
                    spotifyUrl: album.spotifyUrl
                });
                // Factor 1: Emotional Similarity (90%)
                const emotionalScore = vectorMath.cosineSimilarity(userState, embedding);
                // Composite score (diversity applied during selection)
                const compositeScore = 0.9 * emotionalScore;
                // (0.1 diversity applied during final selection)
                return {
                    ...album,
                    emotionalScore,
                    compositeScore,
                    embedding
                };
            }
            catch (error) {
                logger_1.logger.warn("RANK", `Scoring failed for ${album.albumName}: ${error.message}`);
                return {
                    ...album,
                    emotionalScore: 0.5,
                    compositeScore: 0.5,
                    embedding: null
                };
            }
        }));
        logger_1.logger.info("RANK", `✓ Scored ${scored.length} albums`);
        return scored;
    }
    /**
     * Select top 10 albums with diversity penalty applied
     *
     * Sorts by composite score, applies diversity penalty (0.1 weight),
     * and selects top 10 albums ensuring artist variety.
     *
     * @private
     * @param {Array} scored - Pre-scored albums with composite scores
     *
     * @returns {Array} Top 10 selected albums with finalScore
     */
    selectWithDiversityPenalty(scored) {
        const selected = [];
        const sortedByScore = scored.sort((a, b) => b.compositeScore - a.compositeScore);
        for (const album of sortedByScore) {
            if (selected.length >= 10)
                break;
            // Apply diversity penalty for this album
            const diversityScore = this.computeDiversityScore(album.artist, selected);
            const finalScore = 0.9 * album.compositeScore + 0.1 * diversityScore;
            // Add to results
            selected.push({
                ...album,
                finalScore,
                diversityScore
            });
        }
        logger_1.logger.info("RANK", `✓ Selected ${selected.length} albums with diversity penalty, top: ${selected[0]?.artist}`);
        return selected;
    }
    /**
     * Load user's taste profile and perception bias
     *
     * Fetches taste profile and perception bias from user service
     *
     * @private
     * @async
     * @param {string} [userId] - User ID to load profile for
     *
     * @returns {Promise<Object>} { userProfile, perceptionBias } (both may be null)
     */
    async loadUserProfile(userId) {
        logger_1.logger.info("PROFILE", "Loading user 13D taste profile + perception bias");
        let userProfile = null;
        let perceptionBias = null;
        if (userId) {
            const profileLayers = await users_service_1.userService.getUserTasteProfileWithBias13D(userId);
            if (profileLayers) {
                userProfile = profileLayers.taste;
                perceptionBias = profileLayers.bias;
                logger_1.logger.info("PROFILE", "✓ User profile found (with perception bias)");
            }
            else {
                logger_1.logger.warn("PROFILE", "⚠️ No profile yet (using neutral)");
            }
        }
        return { userProfile, perceptionBias };
    }
    /**
     * Format ranked albums into response shape
     *
     * Extracts top 10 and transforms internal representation to API response
     *
     * @private
     * @param {Array} ranked - Ranked albums with scores
     *
     * @returns {Array} Formatted recommendations for API response
     */
    formatRecommendations(ranked) {
        logger_1.logger.info("FORMAT", "Formatting top 10 recommendations");
        const topRecommendations = ranked.slice(0, 10).map(({ compositeScore, finalScore, emotionalScore, ...rest }) => ({
            id: rest.spotifyAlbumId,
            name: rest.albumName,
            artist: rest.artist,
            image: rest.imageUrl,
            spotifyUrl: rest.spotifyUrl,
            emotionalScore: emotionalScore.toFixed(3),
            finalScore: finalScore.toFixed(3)
        }));
        logger_1.logger.info("FORMAT", `✓ Formatted ${topRecommendations.length} recommendations`);
        return topRecommendations;
    }
    /**
     * Enrich Last.fm-only recommendations with Spotify URLs
     *
     * Looks up missing or search-only Spotify URLs for Last.fm albums
     *
     * @private
     * @async
     * @param {Array} recommendations - Recommendations to enrich
     * @param {string} spotifyToken - Spotify API token
     */
    async enrichSpotifyUrls(recommendations, spotifyToken) {
        logger_1.logger.info("ENRICH", "Enriching Spotify URLs for Last.fm candidates");
        for (const rec of recommendations) {
            if (!rec.spotifyUrl || rec.spotifyUrl.includes("?q=")) {
                logger_1.logger.info("ENRICH", `Looking up Spotify ID for "${rec.name}" by ${rec.artist}`);
                const spotifyUrl = await albums_service_1.albumService.searchAlbumOnSpotify(rec.name, rec.artist, spotifyToken);
                if (spotifyUrl) {
                    rec.spotifyUrl = spotifyUrl;
                    logger_1.logger.info("ENRICH", `✓ Found: ${spotifyUrl}`);
                }
                else {
                    logger_1.logger.warn("ENRICH", "⚠️ Not found on Spotify, keeping original URL");
                }
            }
        }
    }
    /**
     * Generate recommendations - MAIN ENTRY POINT (PHASE 4: TWO-STAGE ALGORITHM)
     *
     * Two-stage pipeline: candidate generation (80 albums) → multi-factor ranking (top 10)
     * Scoring: 90% emotional similarity + 10% diversity penalty
     *
     * @async
     * @param {string} spotifyToken - Fresh Spotify access token (pre-refreshed by authMiddleware)
     * @param {number} lat - User latitude coordinate
     * @param {number} lon - User longitude coordinate
     * @param {string} [userId] - Optional: User ID from JWT
     *
     * @returns {Promise<Object>} Recommendation response
     * @returns {Array<Object>} returns.recommendations - Top 10 albums
     * @returns {string} returns.recommendations[].id - Spotify album ID
     * @returns {string} returns.recommendations[].name - Album title
     * @returns {string} returns.recommendations[].artist - Artist name
     * @returns {string} returns.recommendations[].image - Album cover URL
     * @returns {string} returns.recommendations[].spotifyUrl - Link to Spotify
     * @returns {number} returns.recommendations[].emotionalScore - Similarity score [0,1]
     * @returns {number} returns.recommendations[].finalScore - Composite score with diversity [0,1]
     * @returns {Date} returns.generatedAt - Generation timestamp
     *
     * @throws {Error} Any error in pipeline stages
     */
    async generateRecommendations(spotifyToken, lat, lon, userId) {
        try {
            // STEP 1-3: Load Requirements
            // Fetch weather context and user's taste profile from database
            const weatherContext = await weather_service_1.weatherService.getWeatherContextWithModifiers(lat, lon);
            const { userProfile } = await this.loadUserProfile(userId);
            // STEP 4: Compute User State
            // Blend user's taste profile with weather context modifiers using vector addition
            const currentUserState = this.computeCurrentUserState(userProfile, weatherContext);
            // ═════════════════════════════════════════════════════════════════════════════
            // PHASE 4 STAGE 1: CANDIDATE GENERATION
            // ═════════════════════════════════════════════════════════════════════════════
            logger_1.logger.info("MAIN", "─".repeat(80));
            logger_1.logger.info("MAIN", "PHASE 4 - STAGE 1: CANDIDATE GENERATION");
            logger_1.logger.info("MAIN", "─".repeat(80));
            if (!userId) {
                logger_1.logger.warn("MAIN", "No userId provided - cannot generate Last.fm-based candidates");
                return {
                    recommendations: [],
                    generatedAt: new Date()
                };
            }
            const candidates = await candidate_pool_service_1.candidatePoolService.generateCandidatePool(userId, 0.1, 80);
            if (candidates.length === 0) {
                logger_1.logger.warn("MAIN", "No candidates generated");
                return {
                    recommendations: [],
                    generatedAt: new Date()
                };
            }
            logger_1.logger.info("MAIN", `✓ STAGE 1 complete: ${candidates.length} candidates`);
            // ═════════════════════════════════════════════════════════════════════════════
            // ═════════════════════════════════════════════════════════════════════════════
            // PHASE 4 STAGE 2: MULTI-FACTOR RANKING
            // ═════════════════════════════════════════════════════════════════════════════
            // Score all candidates: 90% emotional similarity to user state
            // Compute 7D embeddings and cosine similarity in parallel
            const scored = await this.scoreAlbumCandidates(candidates, currentUserState);
            // Apply diversity penalty and select top 10 albums
            // Penalizes repeated artists, ensures artist variety in final results
            const ranked = this.selectWithDiversityPenalty(scored);
            // Transform internal scoring format into API response shape
            const topRecommendations = this.formatRecommendations(ranked);
            // Lookup and enrich Last.fm albums with actual Spotify URLs
            // Only needed for Last.fm-only albums without stable Spotify IDs
            await this.enrichSpotifyUrls(topRecommendations, spotifyToken);
            return {
                recommendations: topRecommendations,
                generatedAt: new Date()
            };
        }
        catch (error) {
            // Recommendation pipeline failed at some stage
            // Log error details and rethrow to controller
            throw error;
        }
    }
}
/**
 * Recommendation Service instance
 * Singleton exported for use in controllers
 *
 * Implements complete weather-based recommendation algorithm pipeline.
 *
 * @type {RecommendationService}
 */
exports.recommendationService = new RecommendationService();
//# sourceMappingURL=recommendation.service.js.map