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
 *   Score each candidate using 4 factors:
 *   - 55% Emotional Similarity (13D cosine similarity)
 *   - 20% Listening History (saved/liked by user)
 *   - 15% Novelty (not recently recommended)
 *   - 10% Diversity (artist variety in result set)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * BENEFITS OVER SINGLE-STAGE:
 * ✓ Diverse candidates = more exploration (not just similar to seed)
 * ✓ Multi-factor ranking = personalization beyond emotion
 * ✓ History awareness = respects user's listening patterns
 * ✓ Novelty boost = fresh recommendations over time
 * ✓ Diversity penalty = prevents artist over-representation
 *
 * FORMULA - Multi-Factor Score:
 * ────────────────────────────
 *   Score = (0.55 × emotionalSim) +
 *           (0.20 × historyScore) +
 *           (0.15 × noveltyScore) +
 *           (0.10 × diversityScore)
 *
 * Where:
 *   emotionalSim   ∈ [0,1]  (cosine similarity to user state)
 *   historyScore   ∈ [0,1]  (inverse recency of saves)
 *   noveltyScore   ∈ [0,1]  (inverse recency of recommendation)
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
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const album_embedding_service_1 = require("./album-embedding.service");
const context_modifier_service_1 = require("./context-modifier.service");
const candidate_pool_service_1 = require("./candidate-pool.service");
const vectorMath = __importStar(require("../utils/vector-math"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const SPOTIFY_API_URL = "https://accounts.spotify.com/api/token";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
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
     * Get user's Spotify credentials from database
     *
     * @async
     * @param {string} userId - User ID from JWT token
     *
     * @returns {Promise<Object>} User's Spotify tokens
     * @returns {string} returns.spotifyToken - Current access token
     * @returns {string} returns.spotifyRefreshToken - Refresh token (may be empty)
     *
     * @throws {Error} "User not found" if userId invalid
     * @throws {Error} "User not authenticated with Spotify" if no token
     * @throws {Error} "Failed to fetch user credentials: [error details]"
     *
     * Purpose:
     * - Encapsulates database access (clean separation)
     * - Controller should NOT access database directly
     * - If credential storage changes, only this method needs update
     *
     * @example
     * const creds = await recommendationService.getUserSpotifyCredentials(userId);
     * const newToken = await refreshSpotifyToken(creds.spotifyRefreshToken);
     */
    async getUserSpotifyCredentials(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                throw new Error("User not found");
            }
            if (!user.spotifyToken) {
                throw new Error("User not authenticated with Spotify");
            }
            return {
                spotifyToken: user.spotifyToken,
                spotifyRefreshToken: user.spotifyRefreshToken || ""
            };
        }
        catch (error) {
            throw new Error(`Failed to fetch user credentials: ${error.message}`);
        }
    }
    /**
     * Refresh an expired Spotify OAuth token
     *
     * @private
     * @async
     * @param {string} userId - User ID to update token for
     * @param {string} refreshToken - Spotify refresh token
     *
     * @returns {Promise<string>} New access token
     *
     * @throws {Error} "No refresh token available" if refreshToken empty
     * @throws {Error} "Failed to refresh Spotify token: [error details]"
     *
     * Algorithm:
     * 1. Validate refresh token exists
     * 2. Prepare OAuth 2.0 request (grant_type=refresh_token)
     * 3. Call Spotify token endpoint with Client Credentials Basic Auth
     * 4. Extract new access token from response
     * 5. Update token in database (for next use)
     * 6. Return new token for immediate use
     *
     * Called by: generateRecommendations before Spotify API calls
     *
     * @example
     * const newToken = await this.refreshSpotifyToken(userId, refreshToken);
     * // Token now valid for 1 hour
     */
    async refreshSpotifyToken(userId, refreshToken) {
        try {
            if (!refreshToken || refreshToken.length === 0) {
                throw new Error("No refresh token available");
            }
            const params = new URLSearchParams();
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", refreshToken);
            params.append("client_id", CLIENT_ID);
            const response = await axios_1.default.post(SPOTIFY_API_URL, params, {
                timeout: 10000, // 10 second timeout to prevent hanging
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " +
                        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
                },
            });
            const newAccessToken = response.data.access_token;
            // Update token in database
            await prisma.user.update({
                where: { id: userId },
                data: { spotifyToken: newAccessToken }
            });
            return newAccessToken;
        }
        catch (error) {
            throw new Error(`Failed to refresh Spotify token: ${error.message}`);
        }
    }
    /**
     * Get weather at coordinates and compute context modifiers
     *
     * REPLACES OLD getWeatherMood with continuous modifier approach
     *
     * @private
     * @async
     * @param {number} lat - Latitude coordinate
     * @param {number} lon - Longitude coordinate
     *
     * @returns {Promise<Object>} Weather data with context modifiers
     * @returns {string} returns.condition - OpenWeatherMap condition (e.g., "Rainy", "Sunny")
     * @returns {number} returns.temp - Temperature in Celsius
     * @returns {Object} returns.contextModifier - 13D modifier deltas (clamped to [-0.3, +0.3])
     * @returns {number} returns.humidity - Humidity percentage
     *
     * @throws {Error} "OPENWEATHER_API_KEY not configured"
     * @throws {Error} "Weather API error: [error details]"
     *
     * NEW APPROACH:
     * Instead of mapping weather → categorical mood → dimensions,
     * we compute continuous modifiers for each relevant dimension.
     *
     * Example: Cold + Rainy + Night
     * - Temperature: -5°C → warmth +0.20, introspection +0.15, movement -0.10
     * - Precipitation: 0.8 intensity → introspection +0.25, movement -0.15
     * - Time: night → introspection +0.25, arousal -0.20
     * - Season: winter → warmth +0.25, nostalgia +0.15
     * - Compounds: Cold+Rainy synergy → extra introspection +0.10
     *
     * Result: Multiple factors compound naturally, all clamped to [-0.3, +0.3]
     */
    async getWeatherContext(lat, lon) {
        try {
            const apiKey = process.env.OPENWEATHER_API_KEY;
            if (!apiKey) {
                throw new Error("OPENWEATHER_API_KEY not configured");
            }
            // Fetch current weather
            const response = await axios_1.default.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`, { timeout: 10000 });
            const { main, weather, clouds } = response.data;
            const condition = weather[0].main;
            const temp = main.temp;
            const humidity = main.humidity;
            const cloudiness = (clouds?.all ?? 50) / 100; // Convert 0-100 to 0-1
            // Determine time of day (simple heuristic based on sun)
            const hour = new Date().getHours();
            let timeOfDay = "afternoon";
            if (hour < 6)
                timeOfDay = "night";
            else if (hour < 12)
                timeOfDay = "morning";
            else if (hour < 17)
                timeOfDay = "afternoon";
            else
                timeOfDay = "evening";
            // Determine season based on latitude and month
            const month = new Date().getMonth();
            let season = "spring";
            if (month >= 2 && month < 5)
                season = "spring";
            else if (month >= 5 && month < 8)
                season = "summer";
            else if (month >= 8 && month < 11)
                season = "autumn";
            else
                season = "winter";
            // Map weather condition to precipitation intensity
            let precipitationIntensity = 0;
            if (condition === "Rainy" || condition === "Thunderstorm") {
                precipitationIntensity = 0.8; // Heavy
            }
            else if (condition === "Drizzle") {
                precipitationIntensity = 0.3; // Light
            }
            else if (condition === "Snow") {
                precipitationIntensity = 0.6; // Moderate
            }
            // Compute 13D context modifier using continuous weather variables
            const contextModifier = await context_modifier_service_1.contextModifierService.computeContextModifier({
                temperature: temp,
                precipitationIntensity,
                cloudiness,
                humidity,
                visibility: 10, // Default, would need one more API call to get actual
                timeOfDay,
                season
            });
            return {
                condition,
                temp,
                humidity,
                contextModifier,
                season,
                timeOfDay
            };
        }
        catch (error) {
            throw new Error(`Weather API error: ${error.message}`);
        }
    }
    /**
     * Fetch user's 13D taste profile from database
     *
     * REPLACES old 9D getUserTasteProfile with 13D vector extraction
     *
     * @private
     * @async
     * @param {string} userId - User ID to fetch profile for
     *
     * @returns {Promise<Vector13D|null>} User's 13D taste profile vector
     *
     * STRATEGY:
     * Loads user's taste profile from database and extracts 13D vector.
     * Returns null if:
     * - User has no completed surveys yet
     * - User just started onboarding
     * - Database error (graceful fallback)
     *
     * The 13D vector includes:
     * - Psychological core (VAD-based): valence, arousal, introspection, tension
     * - Atmospheric (music-specific): warmth, intimacy, density, spaciousness, organicSynthetic
     * - Experiential: nostalgia, groundedness, movement
     *
     * @example
     * const profile = await this.getUserTasteProfile13D(userId);
     * if (profile) {
     *   // User has completed survey; use for personalization
     *   const userState = vectorMath.addVectors(profile, weatherModifier);
     * } else {
     *   // User new; use neutral profile
     * }
     */
    async getUserTasteProfile13D(userId) {
        try {
            const profile = await prisma.userTasteProfile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return null;
            }
            // Extract 7D taste vector from stored profile
            const vector = {
                valence: profile.valence ?? 0.5,
                arousal: profile.arousal ?? 0.5,
                tension: profile.tension ?? 0.5,
                warmth: profile.warmth ?? 0.5,
                intimacy: profile.intimacy ?? 0.5,
                density: profile.density ?? 0.5,
                groundedness: profile.groundedness ?? 0.5
            };
            return vectorMath.isValidVector(vector) ? vector : null;
        }
        catch (error) {
            console.warn("[RECS] Failed to fetch user profile:", error.message);
            return null;
        }
    }
    /**
     * Get user's BOTH taste and perception bias layers
     *
     * Returns the complete two-layer user profile:
     * - taste: intrinsic emotional preference (what albums they like)
     * - bias: perception offset (how they emotionally reinterpret albums)
     *
     * @private
     * @async
     * @param {string} userId - User ID
     *
     * @returns {Promise<Object|null>} { taste: EmotionalVector, bias: EmotionalVector } or null if no profile
     */
    async getUserTasteProfileWithBias13D(userId) {
        try {
            const profile = await prisma.userTasteProfile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return null;
            }
            // Extract both taste and bias vectors
            const taste = {
                valence: profile.valence ?? 0.5,
                arousal: profile.arousal ?? 0.5,
                tension: profile.tension ?? 0.5,
                warmth: profile.warmth ?? 0.5,
                intimacy: profile.intimacy ?? 0.5,
                density: profile.density ?? 0.5,
                groundedness: profile.groundedness ?? 0.5
            };
            const bias = {
                valence: profile.bias_valence ?? 0.0,
                arousal: profile.bias_arousal ?? 0.0,
                tension: profile.bias_tension ?? 0.0,
                warmth: profile.bias_warmth ?? 0.0,
                intimacy: profile.bias_intimacy ?? 0.0,
                density: profile.bias_density ?? 0.0,
                groundedness: profile.bias_groundedness ?? 0.0
            };
            if (!vectorMath.isValidVector(taste)) {
                return null;
            }
            return { taste, bias };
        }
        catch (error) {
            console.warn("[RECS] Failed to fetch user profile with bias:", error.message);
            return null;
        }
    }
    /**
     * Compute current user state: taste profile + context modifiers
     *
     * REPLACES old blendProfileWithWeather with vector addition approach
     *
     * @private
     * @param {Vector13D|null} userProfile - User's 13D taste profile (or null if new)
     * @param {Object} weatherContext - Weather context with modifier deltas
     *
     * @returns {Vector13D} Current user state in 13D space
     *
     * NEW APPROACH - ADDITIVE MODIFIERS:
     * Instead of: State = (User × 0.6) + (Weather × 0.4)
     * Now use:    State = UserProfile + WeatherModifier
     *
     * This is SUBTLER and more ACCURATE:
     * - User profile stays stable (don't degrade it for weather)
     * - Context modifiers are soft adjustments [-0.3, +0.3] per dimension
     * - Multiple factors compound naturally (cold + rainy + night synergize)
     * - Result is always valid 13D vector (all dimensions 0-1)
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
    computeCurrentUserState(userProfile, weatherContext, perceptionBias) {
        // Start with user profile or neutral
        const baseProfile = userProfile ?? vectorMath.createNeutralVector();
        // Apply perception bias if available
        // Bias is softened to 50% - it gently shifts recommendations, not overrides them
        let stateWithBias = baseProfile;
        if (perceptionBias) {
            const softBias = {
                valence: perceptionBias.valence * 0.5,
                arousal: perceptionBias.arousal * 0.5,
                tension: perceptionBias.tension * 0.5,
                warmth: perceptionBias.warmth * 0.5,
                intimacy: perceptionBias.intimacy * 0.5,
                density: perceptionBias.density * 0.5,
                groundedness: perceptionBias.groundedness * 0.5
            };
            stateWithBias = vectorMath.addVectors(baseProfile, softBias);
            console.log("[RECS] Applied perception bias (50% strength) to user state");
        }
        // Apply weather context modifiers (additive, soft influence)
        if (weatherContext?.contextModifier) {
            return vectorMath.addVectors(stateWithBias, weatherContext.contextModifier);
        }
        return stateWithBias;
    }
    // ═════════════════════════════════════════════════════════════════════════════════
    // PHASE 4: STAGE 1 - CANDIDATE GENERATION (Get ~50 diverse candidates)
    // ═════════════════════════════════════════════════════════════════════════════════
    /**
     * STAGE 1: Generate candidate pool (~50 albums)
     *
     * Fetches diverse candidates from multiple sources:
     * 1. Content-based (Spotify /recommendations with user's mood)
     * 2. Collaborative (albums from similar users) - if available
     * 3. Trending (popular albums in similar mood)
     * 4. Diversity (different genres/artists from content-based)
     *
     * @private
     * @async
     * @param {string} token - Spotify access token
     * @param {Vector13D} userState - Current user state (taste + weather)
     * @param {string} [userId] - Optional user ID for collaborative filtering
     *
     * @returns {Promise<Array>} Array of album candidates with metadata
     *
     * @example
     * const candidates = await this.generateCandidatePool(token, userState, userId);
     * // Returns: [
     * //   { spotifyAlbumId, albumName, artist, imageUrl, spotifyUrl, audioFeatures },
     * //   ...
     * // ]
     */
    /**
     * STAGE 1: Generate candidate pool using Last.fm discovery
     *
     * REPLACES OLD SPOTIFY-ONLY APPROACH
     *
     * NEW STRATEGY:
     * - Extract seed artists from user library
     * - Expand through Last.fm discovery
     * - Add exploratory albums (20% ratio)
     * - Filter invalid candidates
     * - Ensure all have emotional embeddings
     * - Result: 200-500 diverse candidates ready for ranking
     *
     * KEY IMPROVEMENT:
     * - Last.fm provides broad discovery graph
     * - Our emotional ranking system decides what to recommend
     * - No longer limited to Spotify's recommendation bias
     *
     * @private
     * @async
     * @param {string} token - Spotify token (for compatibility, not used for discovery)
     * @param {EmotionalVector} userState - User's current emotional state
     * @param {string} [userId] - User ID (required for candidate pool generation)
     *
     * @returns {Promise<any[]>} Candidate albums ready for emotional ranking
     *
     * @throws {Error} If no seed artists found
     */
    async generateCandidatePool(token, userState, userId) {
        console.log("[PHASE4-S1] [NEW] Generating candidate pool via Last.fm discovery...");
        if (!userId) {
            console.warn("[PHASE4-S1] No userId provided - cannot generate Last.fm-based candidates");
            return [];
        }
        try {
            // Use new Last.fm-based discovery pipeline
            const candidates = await candidate_pool_service_1.candidatePoolService.generateCandidatePool(userId, 0.1, // 10% exploration ratio
            80 // Target 80 candidates pre-filtering
            );
            if (candidates.length === 0) {
                console.warn("[PHASE4-S1] ⚠️  Last.fm discovery returned no candidates");
                return [];
            }
            console.log(`[PHASE4-S1] ✓ Generated ${candidates.length} candidates via Last.fm discovery`);
            return candidates;
        }
        catch (error) {
            console.error("[PHASE4-S1] Last.fm discovery failed:", error.message);
            throw error;
        }
    }
    // ═════════════════════════════════════════════════════════════════════════════════
    // PHASE 4: STAGE 2 - MULTI-FACTOR RANKING (Score and rank candidates)
    // ═════════════════════════════════════════════════════════════════════════════════
    /**
     * Compute emotional similarity score (55% weight)
     *
     * 13D cosine similarity between user state and album embedding
     *
     * @private
     * @param {Vector13D} userState - User's current emotional state
     * @param {Vector13D} albumEmbedding - Album's 13D embedding
     *
     * @returns {number} Similarity score [0, 1]
     */
    computeEmotionalSimilarity(userState, albumEmbedding) {
        return vectorMath.cosineSimilarity(userState, albumEmbedding);
    }
    /**
     * Compute listening history score (20% weight)
     *
     * Albums saved/liked by user get higher scores
     * Older saves get lower scores (more novelty to recent)
     *
     * @private
     * @param {string} spotifyAlbumId - Album to score
     * @param {string} [userId] - User to check against
     *
     * @returns {Promise<number>} History score [0, 1]
     */
    async computeHistoryScore(spotifyAlbumId, userId) {
        if (!userId)
            return 0.5; // Neutral if no user
        try {
            // Check if user has saved this album before
            const favorite = await prisma.favorite.findFirst({
                where: {
                    userId,
                    albumSpotifyId: spotifyAlbumId
                }
            });
            if (!favorite)
                return 0.3; // Not saved = low history score
            // If saved: score based on recency (older saves = lower novelty, but they like it)
            const daysSinceSave = Math.floor((Date.now() - favorite.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            // Score: 0.7 if saved recently, down to 0.5 if saved long ago
            return Math.max(0.5, 0.7 - (daysSinceSave / 365) * 0.2);
        }
        catch (error) {
            console.warn("[PHASE4-S2] History score error:", error.message);
            return 0.5;
        }
    }
    /**
     * Compute novelty score (15% weight)
     *
     * Albums recently recommended get penalized
     * Novel albums (not recommended recently) get boosted
     *
     * @private
     * @param {string} spotifyAlbumId - Album to score
     * @param {string} [userId] - User to check against
     *
     * @returns {Promise<number>} Novelty score [0, 1]
     */
    async computeNoveltyScore(spotifyAlbumId, userId) {
        if (!userId)
            return 0.7; // Assume novel if no user
        try {
            // Check most recent recommendation of this album to user
            const recentRec = await prisma.recommendation.findFirst({
                where: {
                    userId,
                    spotifyId: spotifyAlbumId
                },
                orderBy: {
                    generatedAt: "desc"
                }
            });
            if (!recentRec)
                return 1.0; // Never recommended = fully novel
            // Score based on days since last recommendation
            const daysSinceRec = Math.floor((Date.now() - recentRec.generatedAt.getTime()) / (1000 * 60 * 60 * 24));
            // Score: 0.2 if recommended today, up to 1.0 if >30 days
            return Math.min(1.0, 0.2 + (daysSinceRec / 30) * 0.8);
        }
        catch (error) {
            console.warn("[PHASE4-S2] Novelty score error:", error.message);
            return 0.7;
        }
    }
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
     * STAGE 2: Multi-factor ranking
     *
     * Scores and ranks all candidates using 4-factor model:
     * - 55% Emotional Similarity (13D)
     * - 20% Listening History
     * - 15% Novelty
     * - 10% Diversity
     *
     * @private
     * @async
     * @param {Array} candidates - Candidate albums to rank
     * @param {Vector13D} userState - User's emotional state
     * @param {string} [userId] - User ID for history/novelty
     *
     * @returns {Promise<Array>} Top 10 ranked albums
     */
    async rankCandidates(candidates, userState, userId) {
        console.log("[PHASE4-S2] Ranking candidates with 4-factor model...");
        const scored = await Promise.all(candidates.map(async (album) => {
            try {
                // Compute 13D embedding for this album
                const audioFeaturesObj = album.audioFeatures
                    ? {
                        danceability: album.audioFeatures.danceability || 0.5,
                        energy: album.audioFeatures.energy || 0.5,
                        loudness: album.audioFeatures.loudness || -30,
                        speechiness: album.audioFeatures.speechiness || 0.1,
                        acousticness: album.audioFeatures.acousticness || 0.5,
                        instrumentalness: album.audioFeatures.instrumentalness || 0.2,
                        liveness: album.audioFeatures.liveness || 0.2,
                        valence: album.audioFeatures.valence || 0.5,
                        tempo: album.audioFeatures.tempo || 120,
                        mode: album.audioFeatures.mode || 1,
                        key: album.audioFeatures.key || 0
                    }
                    : {
                        danceability: 0.5,
                        energy: 0.5,
                        loudness: -30,
                        speechiness: 0.1,
                        acousticness: 0.5,
                        instrumentalness: 0.2,
                        liveness: 0.2,
                        valence: 0.5,
                        tempo: 120,
                        mode: 1,
                        key: 0
                    };
                const embedding = await album_embedding_service_1.albumEmbeddingService.getOrComputeEmbedding(album.spotifyAlbumId, audioFeaturesObj, {
                    albumName: album.albumName,
                    artist: album.artist,
                    imageUrl: album.imageUrl,
                    spotifyUrl: album.spotifyUrl
                });
                // Factor 1: Emotional Similarity (55%)
                const emotionalScore = this.computeEmotionalSimilarity(userState, embedding);
                // Factor 2: Listening History (20%)
                const historyScore = await this.computeHistoryScore(album.spotifyAlbumId, userId);
                // Factor 3: Novelty (15%)
                const noveltyScore = await this.computeNoveltyScore(album.spotifyAlbumId, userId);
                // Composite score (diversity applied per-album during selection)
                const compositeScore = 0.55 * emotionalScore + 0.2 * historyScore + 0.15 * noveltyScore;
                // (0.1 diversity applied during final selection)
                return {
                    ...album,
                    emotionalScore,
                    historyScore,
                    noveltyScore,
                    compositeScore,
                    embedding
                };
            }
            catch (error) {
                console.warn("[PHASE4-S2] Scoring failed for album:", error.message);
                return {
                    ...album,
                    emotionalScore: 0.5,
                    historyScore: 0.5,
                    noveltyScore: 0.5,
                    compositeScore: 0.5,
                    embedding: null
                };
            }
        }));
        // Select top 10 with diversity penalty applied
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
        console.log(`[PHASE4-S2] ✓ Ranked ${selected.length} albums, top artist: ${selected[0]?.artist}`);
        return selected;
    }
    /**
     * Generate recommendations - MAIN ENTRY POINT (PHASE 4: TWO-STAGE ALGORITHM)
     *
     * @async
     * @param {string} spotifyToken - Valid Spotify access token
     * @param {number} lat - User latitude coordinate
     * @param {number} lon - User longitude coordinate
     * @param {string} [userId] - Optional: User ID from JWT (for profile/caching)
     * @param {string} [spotifyRefreshToken] - Optional: Refresh token for token renewal
     *
     * @returns {Promise<Object>} Recommendation response
     * @returns {Array<Object>} returns.recommendations - Top 3 albums
     * @returns {string} returns.recommendations[].id - Spotify album ID
     * @returns {string} returns.recommendations[].name - Album title
     * @returns {string} returns.recommendations[].artist - Artist name
     * @returns {string} returns.recommendations[].image - Album cover URL
     * @returns {string} returns.recommendations[].spotifyUrl - Link to Spotify
     * @returns {string} returns.mood - Weather mood (Sunny, Rainy, etc.)
     * @returns {Object} returns.weather - Weather data
     * @returns {string} returns.weather.condition - Weather condition
     * @returns {number} returns.weather.temp - Temperature (Celsius)
     * @returns {number} returns.weather.humidity - Humidity percentage
     * @returns {boolean} returns.cached - Whether from cache
     * @returns {Date} returns.generatedAt - Generation timestamp
     *
     * @throws {Error} Any error in pipeline stages
     *
     * 12-STAGE ALGORITHM PIPELINE:
     *
     * **STAGE 1: Preparation**
     * - Refresh Spotify token if needed (maintains API access)
     * - Load weather at coordinates
     * - Load user's taste profile (from surveys)
     *
     * **STAGE 2: Personalization (Blending)**
     * - Blend user taste (60%) + weather mood (40%)
     * - Result: Personalized emotional profile
     *
     * **STAGE 3: Discovery (Audio Analysis)**
     * - Extract seed artists from emotional dimensions
     * - Convert dimensions to Spotify audio targets
     * - Call Spotify /recommendations with targets
     *
     * **STAGE 4: Filtering**
     * - Filter out albums user already saved
     * - Keep only new discovery candidates
     *
     * **STAGE 5: Ranking**
     * - Score each by similarity to blended profile
     * - Sort by score (highest first)
     * - Return top 3
     *
     * **STAGE 6: Cache**
     * - Save recommendations to database
     * - Fast retrieval on next request
     *
     * RESULT:
     * User gets personalized recommendations that adapt to:
     * ✓ Their musical taste (from surveys)
     * ✓ Current weather/mood
     * ✓ Geographic location
     * ✓ Previously saved albums (no duplicates)
     *
     * @example
     * const recommendations = await recommendationService.generateRecommendations(
     *   accessToken,
     *   40.7128,  // NYC latitude
     *   -74.0060, // NYC longitude
     *   userId,
     *   refreshToken
     * );
     *
     * // Response:
     * // {
     * //   mood: "Rainy",
     * //   weather: { condition: "Rainy", temp: 15, humidity: 85 },
     * //   recommendations: [
     * //     { id: "...", name: "Album", artist: "Artist", image: "...", spotifyUrl: "..." }
     * //   ],
     * //   cached: false,
     * //   generatedAt: 2024-03-15T10:30:00Z
     * // }
     */
    /**
     * Lookup Spotify album ID by searching for album name + artist
     *
     * Used for Last.fm candidates that don't have Spotify IDs.
     * Searches Spotify and returns the direct Spotify album link.
     *
     * @private
     * @async
     * @param {string} albumName - Album name
     * @param {string} artist - Artist name
     * @param {string} spotifyToken - Valid Spotify access token
     *
     * @returns {Promise<string|null>} Direct Spotify album URL or null if not found
     */
    async lookupSpotifyAlbumId(albumName, artist, spotifyToken) {
        try {
            const query = `album:"${albumName}" artist:"${artist}"`;
            const response = await axios_1.default.get('https://api.spotify.com/v1/search', {
                headers: { Authorization: `Bearer ${spotifyToken}` },
                params: {
                    q: query,
                    type: 'album',
                    limit: 1
                }
            });
            const albums = response.data.albums?.items;
            if (albums && albums.length > 0) {
                const albumId = albums[0].id;
                return `https://open.spotify.com/album/${albumId}`;
            }
            return null;
        }
        catch (error) {
            console.warn(`[SPOTIFY-LOOKUP] Failed to lookup ${albumName} by ${artist}:`, error.message);
            return null;
        }
    }
    async generateRecommendations(spotifyToken, lat, lon, userId, spotifyRefreshToken) {
        try {
            console.log("\n" + "=".repeat(80));
            console.log("PHASE 4: TWO-STAGE RECOMMENDATION ALGORITHM");
            console.log("=".repeat(80));
            console.log(`[MAIN] Generating recommendations for user: ${userId || "anonymous"}`);
            console.log(`[MAIN] Location: ${lat}, ${lon}`);
            // STEP 0: CHECK CACHE (optional, disabled for testing new discovery)
            if (userId) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cached = await prisma.recommendation.findMany({
                    where: {
                        userId,
                        generatedAt: { gte: today }
                    },
                    take: 10
                });
                if (cached.length >= 10) {
                    console.log("[MAIN] ✓ Found cached recommendations");
                    const cachedRecommendations = cached.map((r) => ({
                        id: r.spotifyId,
                        name: r.title,
                        artist: r.artist,
                        image: r.imageUrl,
                        spotifyUrl: r.spotifyUrl,
                        cached: true
                    }));
                    return {
                        recommendations: cachedRecommendations,
                        weather: { condition: "Cached", temp: 0, humidity: 0 },
                        cached: true,
                        generatedAt: cached[0].generatedAt
                    };
                }
            }
            // STEP 1: REFRESH SPOTIFY TOKEN
            console.log("\n[MAIN] STEP 1: Refreshing Spotify token");
            let token = spotifyToken;
            if (userId && spotifyRefreshToken && spotifyRefreshToken.length > 0) {
                try {
                    token = await this.refreshSpotifyToken(userId, spotifyRefreshToken);
                    console.log("[MAIN]   ✓ Token refreshed");
                }
                catch (error) {
                    console.warn("[MAIN]   ⚠️  Token refresh failed, continuing:", error.message);
                }
            }
            // STEP 2: GET WEATHER CONTEXT
            console.log("\n[MAIN] STEP 2: Fetching weather context");
            const weatherContext = await this.getWeatherContext(lat, lon);
            console.log(`[MAIN]   ✓ Weather: ${weatherContext.condition}, ${weatherContext.temp}°C`);
            // STEP 3: LOAD USER PROFILE
            console.log("\n[MAIN] STEP 3: Loading user 13D taste profile + perception bias");
            let userProfile = null;
            let perceptionBias = null;
            if (userId) {
                const profileLayers = await this.getUserTasteProfileWithBias13D(userId);
                if (profileLayers) {
                    userProfile = profileLayers.taste;
                    perceptionBias = profileLayers.bias;
                    console.log(`[MAIN]   ✓ User profile found (with perception bias)`);
                }
                else {
                    console.log(`[MAIN]   ⚠️  No profile yet (using neutral)`);
                }
            }
            // STEP 4: COMPUTE CURRENT USER STATE
            console.log("\n[MAIN] STEP 4: Computing user state (profile + bias + weather)");
            const currentUserState = this.computeCurrentUserState(userProfile, weatherContext, perceptionBias || undefined);
            console.log(`[MAIN]   ✓ User state computed in 13D space (valence=${currentUserState.valence.toFixed(2)}, arousal=${currentUserState.arousal.toFixed(2)})`);
            // ═════════════════════════════════════════════════════════════════════════════
            // PHASE 4 STAGE 1: CANDIDATE GENERATION
            // ═════════════════════════════════════════════════════════════════════════════
            console.log("\n" + "─".repeat(80));
            console.log("PHASE 4 - STAGE 1: CANDIDATE GENERATION");
            console.log("─".repeat(80));
            const candidates = await this.generateCandidatePool(token, currentUserState, userId);
            if (candidates.length === 0) {
                console.log("[MAIN] ⚠️  No candidates generated");
                return {
                    recommendations: [],
                    weather: {
                        condition: weatherContext.condition,
                        temp: weatherContext.temp,
                        humidity: weatherContext.humidity
                    },
                    cached: false,
                    generatedAt: new Date()
                };
            }
            console.log(`[MAIN] ✓ STAGE 1 complete: ${candidates.length} candidates`);
            // ═════════════════════════════════════════════════════════════════════════════
            // PHASE 4 STAGE 2: MULTI-FACTOR RANKING
            // ═════════════════════════════════════════════════════════════════════════════
            console.log("\n" + "─".repeat(80));
            console.log("PHASE 4 - STAGE 2: MULTI-FACTOR RANKING");
            console.log("─".repeat(80));
            const ranked = await this.rankCandidates(candidates, currentUserState, userId);
            if (ranked.length === 0) {
                console.log("[MAIN] ⚠️  No candidates ranked");
                return {
                    recommendations: [],
                    weather: {
                        condition: weatherContext.condition,
                        temp: weatherContext.temp,
                        humidity: weatherContext.humidity
                    },
                    cached: false,
                    generatedAt: new Date()
                };
            }
            // Format final recommendations (top 10)
            const topRecommendations = ranked.slice(0, 10).map(({ compositeScore, finalScore, emotionalScore, ...rest }) => ({
                id: rest.spotifyAlbumId,
                name: rest.albumName,
                artist: rest.artist,
                image: rest.imageUrl,
                spotifyUrl: rest.spotifyUrl,
                emotionalScore: emotionalScore.toFixed(3),
                finalScore: finalScore.toFixed(3)
            }));
            console.log(`[MAIN] ✓ STAGE 2 complete: Top 10 selected`);
            // STEP 3B: LOOKUP SPOTIFY URLs FOR LAST.FM ALBUMS
            console.log("\n[MAIN] STEP 3B: Enriching Spotify URLs for Last.fm candidates");
            for (const rec of topRecommendations) {
                // Check if URL is missing or is a search URL (not a direct Spotify link)
                if (!rec.spotifyUrl || rec.spotifyUrl.includes('?q=')) {
                    console.log(`[MAIN]   Looking up Spotify ID for "${rec.name}" by ${rec.artist}...`);
                    const spotifyUrl = await this.lookupSpotifyAlbumId(rec.name, rec.artist, spotifyToken);
                    if (spotifyUrl) {
                        rec.spotifyUrl = spotifyUrl;
                        console.log(`[MAIN]   ✓ Found: ${spotifyUrl}`);
                    }
                    else {
                        console.log(`[MAIN]   ⚠️  Not found on Spotify, keeping original URL`);
                    }
                }
            }
            // STEP 5: CACHE RECOMMENDATIONS
            console.log("\n[MAIN] STEP 5: Caching recommendations");
            if (userId && topRecommendations.length > 0) {
                try {
                    // Only cache recommendations that have spotifyId (Spotify-backed)
                    // Skip Last.fm-only recommendations (no stable ID)
                    const spotifyBacked = topRecommendations.filter(rec => rec.id);
                    if (spotifyBacked.length > 0) {
                        await prisma.recommendation.createMany({
                            data: spotifyBacked.map((rec) => ({
                                userId,
                                spotifyId: rec.id,
                                title: rec.name,
                                artist: rec.artist,
                                imageUrl: rec.image || "",
                                spotifyUrl: rec.spotifyUrl || "",
                                lat,
                                lon,
                                generatedAt: new Date()
                            }))
                        });
                        console.log(`[MAIN]   ✓ ${spotifyBacked.length} cached (${topRecommendations.length - spotifyBacked.length} Last.fm-only, not cached)`);
                    }
                    else {
                        console.log(`[MAIN]   ℹ️  No Spotify-backed recommendations to cache (all Last.fm-only)`);
                    }
                }
                catch (error) {
                    console.warn("[MAIN]   ⚠️  Cache failed:", error.message);
                }
            }
            console.log("\n" + "=".repeat(80));
            console.log("✨ PHASE 4 COMPLETE - TOP 10 RECOMMENDATIONS READY");
            console.log("=".repeat(80) + "\n");
            return {
                recommendations: topRecommendations,
                weather: {
                    condition: weatherContext.condition,
                    temp: weatherContext.temp,
                    humidity: weatherContext.humidity,
                    season: weatherContext.season,
                    timeOfDay: weatherContext.timeOfDay
                },
                cached: false,
                generatedAt: new Date()
            };
        }
        catch (error) {
            console.error("[MAIN] Recommendation pipeline failed:", error);
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
