"use strict";
/**
 * USER PROFILE SERVICE - 13D EDITION
 *
 * Computes 13D user taste profiles from surveyed album embeddings.
 *
 * CORE IDEA:
 * Instead of mapping survey keywords to emotions (error-prone),
 * we compute user profile as the AVERAGE of album embeddings they've surveyed.
 *
 * Example:
 * - User surveys 5 albums
 * - Each album has 13D embedding: [valence, arousal, warmth, ...]
 * - User profile = average([album1, album2, album3, album4, album5])
 * - Result: User profile is EXACTLY in the 13D space
 *
 * BENEFITS:
 * ✅ No keyword mapping needed (less error-prone)
 * ✅ Uses actual computed embeddings (mathematically sound)
 * ✅ Automatically incorporates all features (implicit weighting)
 * ✅ User profile = weighted by albums they chose to survey
 *
 * WORKFLOW:
 * 1. User completes 5+ surveys
 * 2. Get all surveyed album Spotify IDs
 * 3. Fetch their 13D embeddings (cached or computed)
 * 4. Average embeddings → 13D user profile
 * 5. Store in UserTasteProfile 13D fields
 * 6. Ready for recommendations!
 *
 * @category Services
 * @module services/user-profile
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
exports.userProfileService = void 0;
const client_1 = require("@prisma/client");
const album_embedding_service_1 = require("./album-embedding.service");
const vectorMath = __importStar(require("../utils/vector-math"));
const auth_service_1 = require("./auth.service");
const prisma = new client_1.PrismaClient();
/**
 * User Profile Service - 13D
 *
 * Computes and manages 13D user taste profiles from surveyed albums.
 *
 * @class UserProfileService
 */
class UserProfileService {
    /**
     * Ensure Spotify access token is fresh
     * Refreshes if expired, returns new token and updates database
     *
     * @private
     * @async
     * @param {string} userId - User ID to refresh token for
     * @param {string} spotifyAccessToken - Current access token (may be expired)
     *
     * @returns {Promise<string>} Fresh Spotify access token
     */
    async ensureFreshSpotifyToken(userId, spotifyAccessToken) {
        try {
            console.log(`[PROFILE] ensureFreshSpotifyToken called for user ${userId}`);
            console.log(`[PROFILE] Current token:`, {
                length: spotifyAccessToken.length,
                start: spotifyAccessToken.substring(0, 20)
            });
            // Get user's refresh token from database
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { spotifyRefreshToken: true }
            });
            console.log(`[PROFILE] User found:`, !!user);
            console.log(`[PROFILE] Has refresh token:`, !!user?.spotifyRefreshToken);
            if (!user?.spotifyRefreshToken) {
                console.warn(`[PROFILE] No refresh token stored for user ${userId}, using current token`);
                return spotifyAccessToken; // Use what we have
            }
            console.log(`[PROFILE] Attempting to refresh token using refresh token:`, {
                refreshTokenLength: user.spotifyRefreshToken.length,
                refreshTokenStart: user.spotifyRefreshToken.substring(0, 20)
            });
            // Attempt to refresh the access token
            try {
                const newTokens = await auth_service_1.authService.refreshAccessToken(user.spotifyRefreshToken);
                const newAccessToken = newTokens.access_token;
                console.log(`[PROFILE] ✓ Got new access token:`, {
                    newTokenLength: newAccessToken.length,
                    newTokenStart: newAccessToken.substring(0, 20),
                    expiresIn: newTokens.expires_in
                });
                // Update database with fresh token
                const updated = await prisma.user.update({
                    where: { id: userId },
                    data: { spotifyToken: newAccessToken }
                });
                console.log(`[PROFILE] ✓ Updated user in database with new token`);
                return newAccessToken;
            }
            catch (refreshError) {
                console.error(`[PROFILE] Token refresh failed:`, {
                    message: refreshError.message,
                    status: refreshError.response?.status,
                    data: refreshError.response?.data
                });
                // Fall back to using current token (might work, might fail)
                console.log(`[PROFILE] Falling back to current token`);
                return spotifyAccessToken;
            }
        }
        catch (error) {
            console.error(`[PROFILE] Error ensuring fresh token: ${error.message}`);
            return spotifyAccessToken; // Return what we have
        }
    }
    /**
     * Compute 13D user profile from surveyed albums + deviations
     *
     * Algorithm:
     * 1. Fetch all surveyed albums (Spotify IDs + slider responses)
     * 2. For each album:
     *    a. Get/compute 13D embedding from Spotify audio features
     *    b. Get perceived 13D from user's 6 sliders
     *    c. Compute deviation = perceived - actual
     * 3. Average actual embeddings → User Profile
     * 4. Average deviations → User Emotional Deviations
     * 5. Store both in database
     *
     * RESULT:
     * - User Profile: What they actually prefer (based on intrinsic album properties)
     * - Deviations: How user perceives differently from objective features
     *
     * @async
     * @param {string} userId - User ID to compute profile for
     *
     * @returns {Promise<Object>} Object with { taste: EmotionalVector, bias: EmotionalVector }
     *
     * @throws {Error} "No surveys found" if user hasn't surveyed any albums
     * @throws {Error} "Failed to compute profile" on embedding fetch errors
     */
    async computeProfileFrom13DAlbums(userId) {
        console.log(`[PROFILE] Computing 13D profile + deviations for user ${userId}...`);
        try {
            // STEP 1: Fetch all surveyed albums WITH their response data
            // Support both old and new survey formats for backward compatibility
            const surveys = await prisma.albumSurvey.findMany({
                where: { userId },
                select: {
                    spotifyAlbumId: true,
                    albumName: true,
                    artist: true,
                    imageUrl: true,
                    // PHASE 1: New 7D survey responses (0-100 scale) - may be null for old surveys
                    valence_response: true,
                    arousal_response: true,
                    tension_response: true,
                    warmth_response: true,
                    intimacy_response: true,
                    density_response: true,
                    groundedness_response: true
                }
            });
            if (surveys.length === 0) {
                throw new Error("No surveys found");
            }
            console.log(`[PROFILE] Found ${surveys.length} surveyed albums`);
            // STEP 2: For each album, get actual embedding + compute deviation
            const actualEmbeddings = [];
            const deviationVectors = [];
            let successCount = 0;
            for (const survey of surveys) {
                try {
                    // Get or compute actual 13D embedding from Last.fm tags
                    console.log(`[PROFILE] [ALBUM ${successCount + 1}] Retrieving embedding for "${survey.albumName}"...`);
                    let actualEmbedding = await album_embedding_service_1.albumEmbeddingService.getEmbedding(survey.spotifyAlbumId);
                    // If not cached, compute from Last.fm
                    if (!actualEmbedding) {
                        console.log(`[PROFILE] [ALBUM ${successCount + 1}] Cache miss for "${survey.albumName}" - computing from Last.fm...`);
                        // Compute and cache embedding from Last.fm tags (no Spotify needed)
                        const embedding = await album_embedding_service_1.albumEmbeddingService.getOrComputeEmbedding(survey.spotifyAlbumId, {}, // Empty object - not used for Last.fm-only approach
                        {
                            albumName: survey.albumName,
                            artist: survey.artist,
                            imageUrl: survey.imageUrl
                        });
                        actualEmbedding = embedding;
                    }
                    else {
                        console.log(`[PROFILE] [ALBUM ${successCount + 1}] ✓ Cache HIT for "${survey.albumName}"`);
                    }
                    // Get perceived profile from sliders
                    const perceivedProfile = this.convertSurveyResponseTo13D(survey);
                    // Compute deviation = perceived - actual
                    const deviation = {
                        valence: perceivedProfile.valence - actualEmbedding.valence,
                        arousal: perceivedProfile.arousal - actualEmbedding.arousal,
                        tension: perceivedProfile.tension - actualEmbedding.tension,
                        warmth: perceivedProfile.warmth - actualEmbedding.warmth,
                        intimacy: perceivedProfile.intimacy - actualEmbedding.intimacy,
                        density: perceivedProfile.density - actualEmbedding.density,
                        groundedness: perceivedProfile.groundedness - actualEmbedding.groundedness
                    };
                    actualEmbeddings.push(actualEmbedding);
                    deviationVectors.push(deviation);
                    successCount++;
                    if (successCount <= 2) {
                        console.log(`[PROFILE] Album ${successCount}: ${survey.albumName}`, {
                            actual_valence: actualEmbedding.valence.toFixed(2),
                            perceived_valence: perceivedProfile.valence.toFixed(2),
                            deviation: deviation.valence.toFixed(2)
                        });
                    }
                }
                catch (error) {
                    console.warn(`[PROFILE] Warning: Could not process ${survey.albumName}: ${error.message}`);
                    // Continue with next survey
                }
            }
            if (actualEmbeddings.length === 0) {
                throw new Error("Could not process any surveyed albums");
            }
            // STEP 3: Average actual embeddings → Intrinsic Taste
            const intrinsicTaste = vectorMath.averageVectors(actualEmbeddings);
            // STEP 4: Average deviations → Perception Bias
            const perceptionBias = vectorMath.averageVectors(deviationVectors);
            console.log(`[PROFILE] ✓ Computed profile from ${successCount} actual album embeddings`);
            console.log(`[PROFILE] Intrinsic Taste: valence=${intrinsicTaste.valence.toFixed(2)}, arousal=${intrinsicTaste.arousal.toFixed(2)}, warmth=${intrinsicTaste.warmth.toFixed(2)}`);
            console.log(`[PROFILE] Perception Bias: valence=${perceptionBias.valence.toFixed(2)}, arousal=${perceptionBias.arousal.toFixed(2)}, warmth=${perceptionBias.warmth.toFixed(2)}`);
            return {
                taste: intrinsicTaste,
                bias: perceptionBias
            };
        }
        catch (error) {
            console.error(`[PROFILE] Failed to compute profile: ${error.message}`);
            throw error;
        }
    }
    /**
     * Fetch Spotify audio features for an album
     *
     * Uses the batch endpoint /audio-features?ids=... which may have better scope support
     *
     * @private
     * @param {string} spotifyAlbumId - Spotify album ID
     * @param {Object} spotifyClient - Axios Spotify client instance
     *
     * @returns {Promise<Record<string, number>>} Audio features map
     */
    async fetchAudioFeaturesForAlbum(spotifyAlbumId, spotifyClient) {
        try {
            console.log(`[PROFILE] Fetching album data for: ${spotifyAlbumId}`);
            // Get album details from Spotify API
            const albumResponse = await spotifyClient.get(`/albums/${spotifyAlbumId}`);
            const album = albumResponse.data;
            // Get first 5 track IDs
            if (!album.tracks?.items || album.tracks.items.length === 0) {
                console.warn(`[PROFILE] Album ${spotifyAlbumId} has no tracks`);
                return this.getDefaultAudioFeatures();
            }
            const trackIds = album.tracks.items.slice(0, 5).map((t) => t.id);
            console.log(`[PROFILE] Fetching batch audio features for ${trackIds.length} tracks`);
            try {
                // Use batch endpoint: /audio-features?ids=id1,id2,id3
                const batchResponse = await spotifyClient.get(`/audio-features`, {
                    params: { ids: trackIds.join(',') }
                });
                const featuresArray = batchResponse.data.audio_features || [];
                console.log(`[PROFILE] Got batch features response with ${featuresArray.length} items`);
                // Use first successfully returned track's features (not null)
                const features = featuresArray.find((f) => f !== null);
                if (!features) {
                    console.warn(`[PROFILE] No valid audio features in batch response`);
                    return this.getDefaultAudioFeatures();
                }
                console.log(`[PROFILE] ✓ Got audio features:`, {
                    valence: features.valence?.toFixed(2),
                    energy: features.energy?.toFixed(2),
                    acousticness: features.acousticness?.toFixed(2),
                    danceability: features.danceability?.toFixed(2)
                });
                return {
                    valence: features.valence ?? 0.5,
                    energy: features.energy ?? 0.5,
                    acousticness: features.acousticness ?? 0.5,
                    danceability: features.danceability ?? 0.5,
                    instrumentalness: features.instrumentalness ?? 0.5,
                    loudness: features.loudness ?? -5,
                    mode: features.mode ?? 1,
                    tempo: features.tempo ?? 120,
                    key: features.key ?? 0,
                    speechiness: features.speechiness ?? 0,
                    liveness: features.liveness ?? 0
                };
            }
            catch (batchError) {
                console.error(`[PROFILE] Batch endpoint failed:`, {
                    message: batchError.message,
                    status: batchError.response?.status,
                    statusText: batchError.response?.statusText
                });
                return this.getDefaultAudioFeatures();
            }
        }
        catch (error) {
            console.error(`[PROFILE] ERROR fetching album/track data:`, {
                albumId: spotifyAlbumId,
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            return this.getDefaultAudioFeatures();
        }
    }
    /**
     * Save 13D user profile to database
     *
     * @async
     * @param {string} userId - User ID to save profile for
     * @param {Vector13D} profile - 13D user profile vector
     *
     * @returns {Promise<Object>} Saved UserTasteProfile record
     *
     * @throws {Error} On database errors
     *
     * Algorithm:
     * - Upsert: update if exists, create if new
     * - Save all 13 dimensions
     * - Set albumsAnalyzed count
     * - Keep old 9D fields for backward compat (at neutral values)
     */
    async save13DProfile(userId, profileLayers) {
        console.log(`[PROFILE] Saving 13D profile + bias layers for user ${userId}...`);
        try {
            const surveyCount = await prisma.albumSurvey.count({ where: { userId } });
            const { taste, bias } = profileLayers;
            const savedProfile = await prisma.userTasteProfile.upsert({
                where: { userId },
                update: {
                    // INTRINSIC TASTE LAYER (what albums user gravitates toward)
                    valence: taste.valence,
                    arousal: taste.arousal,
                    tension: taste.tension,
                    warmth: taste.warmth,
                    intimacy: taste.intimacy,
                    density: taste.density,
                    groundedness: taste.groundedness,
                    // PERCEPTION BIAS LAYER (how user emotionally reinterprets albums)
                    bias_valence: bias.valence,
                    bias_arousal: bias.arousal,
                    bias_tension: bias.tension,
                    bias_warmth: bias.warmth,
                    bias_intimacy: bias.intimacy,
                    bias_density: bias.density,
                    bias_groundedness: bias.groundedness,
                    albumsAnalyzed: surveyCount,
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    // INTRINSIC TASTE LAYER
                    valence: taste.valence,
                    arousal: taste.arousal,
                    tension: taste.tension,
                    warmth: taste.warmth,
                    intimacy: taste.intimacy,
                    density: taste.density,
                    groundedness: taste.groundedness,
                    // PERCEPTION BIAS LAYER
                    bias_valence: bias.valence,
                    bias_arousal: bias.arousal,
                    bias_tension: bias.tension,
                    bias_warmth: bias.warmth,
                    bias_intimacy: bias.intimacy,
                    bias_density: bias.density,
                    bias_groundedness: bias.groundedness,
                    albumsAnalyzed: surveyCount,
                    // Keep legacy 9D at neutral for backward compat
                    nature: 0.5,
                    healing: 0.5,
                    melancholy: 0.5,
                    freedom: 0.5,
                    energyLevel: 0.5,
                    coziness: 0.5,
                    dreaminess: 0.5
                }
            });
            console.log(`[PROFILE] ✓ SAVED both layers (${surveyCount} albums analyzed)`);
            console.log(`[PROFILE]   LAYER 1 - Intrinsic Taste Profile:`);
            console.log(`[PROFILE]     valence=${taste.valence.toFixed(2)}, arousal=${taste.arousal.toFixed(2)}, tension=${taste.tension.toFixed(2)}`);
            console.log(`[PROFILE]     warmth=${taste.warmth.toFixed(2)}, intimacy=${taste.intimacy.toFixed(2)}, density=${taste.density.toFixed(2)}, groundedness=${taste.groundedness.toFixed(2)}`);
            console.log(`[PROFILE]   LAYER 2 - Perception Bias Profile:`);
            console.log(`[PROFILE]     bias_valence=${bias.valence.toFixed(2)}, bias_arousal=${bias.arousal.toFixed(2)}, bias_tension=${bias.tension.toFixed(2)}`);
            console.log(`[PROFILE]     bias_warmth=${bias.warmth.toFixed(2)}, bias_intimacy=${bias.intimacy.toFixed(2)}, bias_density=${bias.density.toFixed(2)}, bias_groundedness=${bias.groundedness.toFixed(2)}`);
            return savedProfile;
        }
        catch (error) {
            console.error(`[PROFILE] Failed to save profile: ${error.message}`);
            throw error;
        }
    }
    /**
     * Compute AND save 13D user profile (one-shot)
     *
     * Convenience method that does both steps:
     * 1. Compute from actual embeddings
     * 2. Save to database
     *
     * @async
     * @param {string} userId - User ID
     *
     * @returns {Promise<Object>} Saved profile with taste and bias layers
     *
     * @example
     * const profile = await userProfileService.generateAndSave13DProfile(userId);
     */
    async generateAndSave13DProfile(userId) {
        // Compute from surveyed albums with actual embeddings
        // Returns both intrinsic taste and perception bias layers
        const profileLayers = await this.computeProfileFrom13DAlbums(userId);
        // Save both layers to database
        const saved = await this.save13DProfile(userId, profileLayers);
        return saved;
    }
    /**
     * Get user's 13D profile from database
     *
     * @async
     * @param {string} userId - User ID
     *
     * @returns {Promise<Vector13D|null>} 13D profile vector, or null if not found
     */
    async get13DProfile(userId) {
        try {
            const profile = await prisma.userTasteProfile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return null;
            }
            return {
                valence: profile.valence ?? 0.5,
                arousal: profile.arousal ?? 0.5,
                tension: profile.tension ?? 0.5,
                warmth: profile.warmth ?? 0.5,
                intimacy: profile.intimacy ?? 0.5,
                density: profile.density ?? 0.5,
                groundedness: profile.groundedness ?? 0.5
            };
        }
        catch (error) {
            console.warn(`[PROFILE] Failed to fetch profile: ${error.message}`);
            return null;
        }
    }
    /**
     * Convert 6 survey slider responses to 13D emotional vector
     *
     * MAPPING STRATEGY:
     * The 6 sliders cover 6 of the 13 dimensions.
     * Unknown dimensions set to 0.5 (neutral).
     *
     * SLIDER INTERPRETATION:
     * - intimacy_response: 0=intimate, 100=distant (INVERT to get 1=intimate, 0=distant)
     * - warmth_response: 0=warm, 100=cold (INVERT)
     * - groundedness_response: 0=grounded, 100=dreamy (direct - but we only fill groundedness)
     * - arousal_response: 0=calm, 100=energized (direct)
     * - introspection_response: 0=reflective, 100=external (INVERT)
     * - density_response: 0=dense, 100=sparse (fill both density and spaciousness)
     *
     * @private
     * @param {Object} survey - Survey response object with slider values (0-100)
     * @returns {Vector13D} 13D vector representing user's perception
     */
    convertSurveyResponseTo13D(survey) {
        // Normalize all inputs to 0-1 scale
        const normalize = (value) => {
            if (value === null || value === undefined)
                return 0.5; // Default to neutral
            return Math.max(0, Math.min(1, value / 100)); // Clamp to 0-1
        };
        // BACKWARD COMPATIBILITY: Handle old surveys that don't have new 7D fields
        // If new fields are missing (null), try to infer from old fields or use neutral
        // Valence (0=Sad, 100=Happy): old form didn't collect this, estimate from warmth + arousal
        let valence = normalize(survey.valence_response);
        if (survey.valence_response === null || survey.valence_response === undefined) {
            // If missing, estimate from warmth (correlation: warm albums tend to be happier)
            if (survey.warmth_response !== null && survey.warmth_response !== undefined) {
                valence = normalize(survey.warmth_response); // Use warmth as proxy
            }
            // Otherwise stay at 0.5 (neutral)
        }
        // Tension (0=Relaxed, 100=Tense): old form didn't collect this
        // Estimate from arousal: high arousal can mean high tension
        let tension = normalize(survey.tension_response);
        if (survey.tension_response === null || survey.tension_response === undefined) {
            if (survey.arousal_response !== null && survey.arousal_response !== undefined) {
                // Tense albums tend to have moderate-to-high arousal
                // But not all high-arousal is tense (could be joyful)
                // Conservative: use 0.5 as default unless we have more data
                tension = 0.5;
            }
        }
        return {
            // PHASE 1: 7D survey responses (all 0-100 scale, normalized to 0-1)
            // With backward compatibility for old surveys
            valence: valence,
            arousal: normalize(survey.arousal_response),
            tension: tension,
            warmth: 1.0 - normalize(survey.warmth_response), // INVERT: 0=warm, 100=cold → 1=warm, 0=cold
            intimacy: 1.0 - normalize(survey.intimacy_response), // INVERT: 0=intimate, 100=distant → 1=intimate, 0=distant
            density: normalize(survey.density_response),
            groundedness: normalize(survey.groundedness_response)
        };
    }
    /**
     * Get default audio features (fallback for unknown albums)
     *
     * @private
     * @returns {Record<string, number>} Neutral audio features
     */
    getDefaultAudioFeatures() {
        return {
            danceability: 0.5,
            energy: 0.5,
            loudness: -5,
            speechiness: 0,
            acousticness: 0.5,
            instrumentalness: 0,
            liveness: 0,
            valence: 0.5,
            tempo: 120,
            mode: 1,
            key: 0
        };
    }
}
exports.userProfileService = new UserProfileService();
