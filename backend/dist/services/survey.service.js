"use strict";
/**
 * Survey Service
 *
 * Business logic for survey responses and taste profile generation.
 * Orchestrates:
 * - Saving emotional survey responses to database (upsert pattern)
 * - Fetching survey data for analysis and UI display
 * - Analyzing surveys to generate 9D emotional taste profiles
 * - Managing available vs completed albums
 *
 * Survey workflow:
 * 1. User completes survey for an album (emotions, vibes, contexts, etc.)
 * 2. Survey saved via saveSurveyResponse() with upsert pattern
 * 3. After 5+ surveys: User can call generateTasteProfile()
 * 4. Taste profile calculates 9 emotional dimensions (0-1 scale)
 * 5. Recommendations service uses taste profile for personalization
 *
 * Database operations use Prisma ORM with upsert for idempotency.
 *
 * @category Services
 * @module services/survey
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.surveyService = void 0;
const client_1 = require("@prisma/client");
const albums_service_1 = require("./albums.service");
const user_profile_service_1 = require("./user-profile.service");
const album_clustering_service_1 = require("./album-clustering.service");
const prisma = new client_1.PrismaClient();
/**
 * Survey Service
 *
 * Manages survey responses and taste profile generation.
 * All database operations use Prisma ORM.
 *
 * @class SurveyService
 */
class SurveyService {
    /**
     * Save or update a survey response for an album
     *
     * @async
     * @param {SaveSurveyDTO} params - Survey data
     * @param {string} params.userId - User ID
     * @param {string} params.spotifyAlbumId - Spotify album ID
     * @param {string} params.albumName - Album title
     * @param {string} params.artist - Artist name
     * @param {string} params.imageUrl - Album cover URL
     * @param {Array<string>} params.seasons - Seasons for listening
     * @param {Array<string>} params.emotions - Emotions evoked
     * @param {Array<string>} params.whenYouListen - Listening contexts
     * @param {string} params.movementPreference - Music movement
     * @param {Array<string>} params.vibe - Vibes/moods
     * @param {string} params.optionalNote - Optional user comment
     *
     * @returns {Promise<Object>} Saved survey record
     *
     * @throws {Error} "Failed to save survey: [error details]"
     *
     * Details:
     * - Uses Prisma upsert: if user already surveyed this album, update it; otherwise create
     * - Ensures only one survey per user-album combination (no duplicates)
     * - Updates: only survey fields and timestamp on re-survey
     * - Creates: full survey record if first time surveying album
     *
     * @example
     * await surveyService.saveSurveyResponse({
     *   userId: "user123",
     *   spotifyAlbumId: "album456",
     *   albumName: "Album Title",
     *   artist: "Artist",
     *   imageUrl: "url...",
     *   seasons: ["autumn", "winter"],
     *   emotions: ["melancholic"],
     *   whenYouListen: ["studying"],
     *   movementPreference: "reflect",
     *   vibe: ["atmospheric"],
     *   optionalNote: "Great for studying"
     * });
     */
    async saveSurveyResponse(params) {
        try {
            // Build update object dynamically to handle optional fields
            const updateData = {
                seasons: params.seasons || [],
                emotions: params.emotions || [],
                whenYouListen: params.whenYouListen || [],
                vibe: params.vibe || [],
                optionalNote: params.optionalNote,
                updatedAt: new Date()
            };
            // Add optional fields only if defined
            if (params.movementPreference !== undefined) {
                updateData.movementPreference = params.movementPreference;
            }
            if (params.valence_response !== undefined) {
                updateData.valence_response = params.valence_response;
            }
            if (params.arousal_response !== undefined) {
                updateData.arousal_response = params.arousal_response;
            }
            if (params.tension_response !== undefined) {
                updateData.tension_response = params.tension_response;
            }
            if (params.warmth_response !== undefined) {
                updateData.warmth_response = params.warmth_response;
            }
            if (params.intimacy_response !== undefined) {
                updateData.intimacy_response = params.intimacy_response;
            }
            if (params.density_response !== undefined) {
                updateData.density_response = params.density_response;
            }
            if (params.groundedness_response !== undefined) {
                updateData.groundedness_response = params.groundedness_response;
            }
            // Build create object with all fields
            const createData = {
                userId: params.userId,
                spotifyAlbumId: params.spotifyAlbumId,
                albumName: params.albumName,
                artist: params.artist,
                imageUrl: params.imageUrl,
                seasons: params.seasons || [],
                emotions: params.emotions || [],
                whenYouListen: params.whenYouListen || [],
                vibe: params.vibe || [],
                optionalNote: params.optionalNote
            };
            // Add optional fields to create if defined
            if (params.movementPreference !== undefined) {
                createData.movementPreference = params.movementPreference;
            }
            if (params.valence_response !== undefined) {
                createData.valence_response = params.valence_response;
            }
            if (params.arousal_response !== undefined) {
                createData.arousal_response = params.arousal_response;
            }
            if (params.tension_response !== undefined) {
                createData.tension_response = params.tension_response;
            }
            if (params.warmth_response !== undefined) {
                createData.warmth_response = params.warmth_response;
            }
            if (params.intimacy_response !== undefined) {
                createData.intimacy_response = params.intimacy_response;
            }
            if (params.density_response !== undefined) {
                createData.density_response = params.density_response;
            }
            if (params.groundedness_response !== undefined) {
                createData.groundedness_response = params.groundedness_response;
            }
            // Upsert prevents duplicate surveys for same user+album
            const survey = await prisma.albumSurvey.upsert({
                where: {
                    userId_spotifyAlbumId: {
                        userId: params.userId,
                        spotifyAlbumId: params.spotifyAlbumId
                    }
                },
                update: updateData,
                create: createData
            });
            console.log(`[SURVEY] Phase 1 survey saved for album ${params.spotifyAlbumId}:`, {
                sliders: {
                    valence: params.valence_response,
                    arousal: params.arousal_response,
                    tension: params.tension_response,
                    warmth: params.warmth_response,
                    intimacy: params.intimacy_response,
                    density: params.density_response,
                    groundedness: params.groundedness_response
                }
            });
            return survey;
        }
        catch (error) {
            throw new Error(`Failed to save survey: ${error.message}`);
        }
    }
    /**
     * Count surveys completed by a user
     *
     * @async
     * @param {string} userId - User ID to count surveys for
     *
     * @returns {Promise<number>} Total number of surveys completed
     *
     * @throws {Error} "Failed to count surveys: [error details]"
     *
     * Purpose: Determine if user has enough surveys (5+) to generate taste profile
     *
     * @example
     * const count = await surveyService.getCompletedSurveyCount(userId);
     * if (count >= 5) {
     *   // User can generate taste profile
     * }
     */
    async getCompletedSurveyCount(userId) {
        try {
            // Simple count query - fast and doesn't fetch full survey data
            const count = await prisma.albumSurvey.count({
                where: { userId }
            });
            return count;
        }
        catch (error) {
            throw new Error(`Failed to count surveys: ${error.message}`);
        }
    }
    /**
     * Fetch all surveys for a user
     *
     * @async
     * @param {string} userId - User ID to fetch surveys for
     *
     * @returns {Promise<Array<Object>>} All survey records, newest first
     *
     * @throws {Error} "Failed to fetch surveys: [error details]"
     *
     * Purpose: Retrieve all emotional feedback data for taste profile generation
     * Ordered by creation date (newest first)
     *
     * @example
     * const surveys = await surveyService.getAllSurveys(userId);
     * // surveys[0] = most recent survey
     */
    async getAllSurveys(userId) {
        try {
            // Get all albums surveyed by user, most recent first
            const surveys = await prisma.albumSurvey.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" }
            });
            return surveys;
        }
        catch (error) {
            throw new Error(`Failed to fetch surveys: ${error.message}`);
        }
    }
    /**
     * Get user's surveyed albums (already analyzed)
     *
     * @async
     * @param {string} userId - User ID to fetch surveys for
     * @param {number} [limit=10] - Maximum albums to return
     *
     * @returns {Promise<Array<FormattedAlbumDTO>>} Surveyed albums, newest first
     *
     * Details:
     * - Fetches survey records from database
     * - Transforms to FormattedAlbumDTO format
     * - Returns empty array on error (graceful fallback)
     * - Always returns newest surveys first
     *
     * FormattedAlbumDTO fields:
     * - spotifyId: Album ID (primary key)
     * - name: Album title
     * - artist: Artist name
     * - imageUrl: Album cover URL
     * - spotifyUrl: Link to Spotify
     *
     * @example
     * const surveyed = await surveyService.getSurveyedAlbums(userId, 10);
     * // Returns array of albums, most recent surveys first
     */
    async getSurveyedAlbums(userId, limit = 10) {
        try {
            // STAGE 1: Fetch survey records from database for this user
            const surveys = await prisma.albumSurvey.findMany({
                where: { userId }, // Filter by user
                orderBy: { createdAt: "desc" }, // Most recent first
                take: limit, // Limit to requested number
            });
            // STAGE 2: Transform survey records to FormattedAlbumDTO
            return surveys.map((survey) => ({
                spotifyId: survey.spotifyAlbumId, // Spotify album ID from survey
                name: survey.albumName, // Album name saved in survey
                artist: survey.artist, // Artist name saved in survey
                imageUrl: survey.imageUrl, // Album cover saved in survey
                spotifyUrl: `https://open.spotify.com/album/${survey.spotifyAlbumId}`, // Construct Spotify link
            }));
        }
        catch (error) {
            console.error("Error fetching surveyed albums:", error);
            return [];
        }
    }
    /**
     * Get available albums for user to survey (unsurveyed only)
     *
     * @async
     * @param {string} accessToken - Spotify OAuth access token
     * @param {string} userId - User ID to check surveyed albums against
     * @param {number} [limit=15] - Maximum Spotify albums to fetch
     *
     * @returns {Promise<Array<FormattedAlbumDTO>>} Albums user hasn't surveyed
     *
     * @throws {Error} If Spotify API call fails
     *
     * Algorithm:
     * 1. STAGE 1: Fetch saved albums from Spotify (up to limit)
     * 2. STAGE 2: Get albums user already surveyed (creates Set for O(1) lookup)
     * 3. STAGE 3: Filter out surveyed albums (keep only NEW albums)
     * 4. STAGE 4: Return available albums for user to survey
     *
     * Optimization: Uses Set for O(1) album ID lookup during filtering
     *
     * @example
     * const available = await surveyService.getAvailableAlbumsForSurvey(token, userId, 15);
     * // Returns new albums user hasn't surveyed yet
     */
    async getAvailableAlbumsForSurvey(accessToken, userId, limit = 15) {
        try {
            // STAGE 1: Fetch all saved albums from Spotify
            const savedAlbums = await albums_service_1.albumService.getSavedAlbumsFromSpotify(accessToken, limit * 2); // Get more for clustering
            // STAGE 2: Get already-surveyed albums
            const surveyedAlbums = await this.getSurveyedAlbums(userId);
            const surveyedIds = new Set(surveyedAlbums.map(a => a.spotifyId));
            // STAGE 3: Filter out surveyed albums
            const availableAlbums = savedAlbums.filter((album) => !surveyedIds.has(album.spotifyId));
            if (availableAlbums.length === 0) {
                console.log("[SURVEY] No available albums left to survey");
                return [];
            }
            // STAGE 4: Use clustering to select emotionally-diverse anchors (NEW - PHASE 0)
            console.log(`[SURVEY] Using clustering to select emotionally-diverse survey albums...`);
            const anchorAlbums = await album_clustering_service_1.albumClusteringService.selectSurveyAlbums(availableAlbums.map(a => ({
                spotifyAlbumId: a.spotifyId,
                albumName: a.name,
                artist: a.artist,
                imageUrl: a.imageUrl
            })));
            // Convert back to FormattedAlbumDTO format
            return anchorAlbums.map(anchor => ({
                spotifyId: anchor.spotifyAlbumId,
                name: anchor.albumName,
                artist: anchor.artist,
                imageUrl: anchor.imageUrl || "",
                spotifyUrl: ""
            }));
        }
        catch (error) {
            console.error("Error getting available albums for survey:", error);
            throw error;
        }
    }
    /**
     * PRIVATE: Analyze emotional profile from surveys
     *
     * @private
     * @param {Array<Object>} surveys - Survey records from database
     *
     * @returns {EmotionalAnalysisDTO} 9D emotional profile analysis
     *
     * Analyzes surveys to extract emotional dimensions (0-1 scale):
     * 1. movement - How much user wants to move/dance
     * 2. energyLevel - Intensity and vibrancy of preferred music
     * 3. melancholy - Preference for emotional/sad music
     * 4. coziness - Preference for warm/intimate sound
     * 5. introspection - Preference for reflective/thoughtful music
     * 6. dreaminess - Preference for ethereal/otherworldly sound
     * 7. nature - Preference for organic/acoustic vibes
     * 8. healing - Preference for soothing/therapeutic music
     * 9. freedom - Preference for expansive/liberating sound
     *
     * Algorithm:
     * - Extract movementPreference as direct dimension score
     * - Match keywords in emotions array to dimension keywords
     * - Match keywords in vibe array to dimension keywords
     * - Accumulate scores across all surveys
     * - Normalize to 0-1 scale by dividing by survey count
     * - Return neutral 0.5 profile if no surveys exist
     *
     * Note: dominantThemes, userType, preferences are set to defaults.
     * Future enhancement: Extract more insights from survey patterns.
     *
     * @example
     * const analysis = this.analyzeEmotionalProfile(surveys);
     * // analysis.emotionalProfile.movement = 0.75
     * // analysis.emotionalProfile.nature = 0.45
     */
    analyzeEmotionalProfile(surveys) {
        // Initialize counters for each dimension (higher = more of that quality)
        let movement = 0; // From movementPreference field
        let energyLevel = 0; // From vibe matches (energetic, uplifting, etc)
        let melancholy = 0; // From emotions array (sad, melancholic, etc)
        let coziness = 0; // From vibe matches (cozy, intimate, warm, etc)
        let introspection = 0; // From emotions array (reflective, thoughtful, etc)
        let dreaminess = 0; // From vibe matches (dreamy, ethereal, etc)
        let nature = 0; // From vibe matches (acoustic, folk, natural, organic)
        let healing = 0; // From emotions array (comforting, soothing, etc)
        let freedom = 0; // From vibe matches (uplifting, liberating, expansive, etc)
        /**
         * Keyword map for vibe analysis
         * Each emotional dimension has keywords that trigger it when found in vibe responses
         */
        const keywordMap = {
            movement: ['dance', 'upbeat', 'energetic', 'lively', 'rhythmic'],
            energyLevel: ['energetic', 'uplifting', 'vibrant', 'powerful', 'intense'],
            melancholy: ['sad', 'melancholic', 'emotional', 'dark', 'moody'],
            coziness: ['cozy', 'intimate', 'warm', 'gentle', 'soft'],
            introspection: ['reflective', 'thoughtful', 'introspective', 'quiet', 'calm'],
            dreaminess: ['dreamy', 'ethereal', 'mystical', 'cosmic', 'surreal'],
            nature: ['acoustic', 'folk', 'natural', 'organic'],
            healing: ['comforting', 'soothing', 'healing', 'chill', 'relaxing'],
            freedom: ['uplifting', 'liberating', 'expansive', 'free', 'open']
        };
        // Process each survey and accumulate scores
        if (surveys.length > 0) {
            surveys.forEach((survey) => {
                // ===== MOVEMENT PREFERENCE =====
                // Direct values from user's movement preference choice
                if (survey.movementPreference === 'dance' || survey.movementPreference === 'dance')
                    movement += 1.0;
                else if (survey.movementPreference === 'walk')
                    movement += 0.6;
                else if (survey.movementPreference === 'slow')
                    movement += 0.2;
                // (other values: 'reflect', 'dream', 'relax' - not affecting movement score)
                // ===== EMOTIONS ANALYSIS =====
                // User selected emotional responses for the album
                if (survey.emotions && Array.isArray(survey.emotions)) {
                    survey.emotions.forEach((emotion) => {
                        // Convert to lowercase for consistent matching
                        const emotionLower = emotion.toLowerCase();
                        // Check for happy/joyful emotions
                        if (emotionLower.includes('hopeful') || emotionLower.includes('uplifting') || emotionLower.includes('energetic')) {
                            energyLevel += 0.3;
                            healing += 0.2;
                        }
                        // Check for sad/melancholic emotions
                        if (emotionLower.includes('melancholic') || emotionLower.includes('peaceful') || emotionLower.includes('sad')) {
                            melancholy += 0.4;
                        }
                        // Check for introspective emotions
                        if (emotionLower.includes('introspective') || emotionLower.includes('thoughtful')) {
                            introspection += 0.3;
                        }
                        // Check for cozy/comforting emotions
                        if (emotionLower.includes('cozy') || emotionLower.includes('healing') || emotionLower.includes('comforting')) {
                            coziness += 0.3;
                        }
                    });
                }
                // ===== VIBE ANALYSIS =====
                // User selected vibe descriptors for the album
                if (survey.vibe && Array.isArray(survey.vibe)) {
                    // Combine all vibe selections into one searchable string
                    const vibeText = survey.vibe.join(' ').toLowerCase();
                    // Check each dimension's keywords in the vibe text
                    keywordMap.energyLevel.forEach(keyword => {
                        if (vibeText.includes(keyword))
                            energyLevel += 0.2;
                    });
                    keywordMap.coziness.forEach(keyword => {
                        if (vibeText.includes(keyword))
                            coziness += 0.2;
                    });
                    keywordMap.dreaminess.forEach(keyword => {
                        if (vibeText.includes(keyword))
                            dreaminess += 0.2;
                    });
                    keywordMap.nature.forEach(keyword => {
                        if (vibeText.includes(keyword))
                            nature += 0.2;
                    });
                    keywordMap.healing.forEach(keyword => {
                        if (vibeText.includes(keyword))
                            healing += 0.2;
                    });
                    keywordMap.freedom.forEach(keyword => {
                        if (vibeText.includes(keyword))
                            freedom += 0.2;
                    });
                }
            });
            // ===== NORMALIZE SCORES =====
            // Convert accumulated scores to 0-1 scale
            // Divide by number of surveys so longer histories don't grow unbounded
            const normalize = (value) => Math.min(value / surveys.length, 1.0);
            // Return analyzed profile with all dimensions normalized
            return {
                emotionalProfile: {
                    movement: normalize(movement),
                    energyLevel: normalize(energyLevel),
                    melancholy: normalize(melancholy),
                    coziness: normalize(coziness),
                    introspection: normalize(introspection),
                    dreaminess: normalize(dreaminess),
                    nature: normalize(nature),
                    healing: normalize(healing),
                    freedom: normalize(freedom)
                },
                // TODO: These are not populated yet - could extract from survey data
                dominantThemes: [],
                userType: 'music-lover',
                preferredContexts: [],
                preferredMovements: [],
                seasonalPreference: null,
                insights: null
            };
        }
        // ===== DEFAULT PROFILE =====
        // If no surveys exist, return neutral profile (all 0.5)
        return {
            emotionalProfile: {
                movement: 0.5,
                energyLevel: 0.5,
                melancholy: 0.5,
                coziness: 0.5,
                introspection: 0.5,
                dreaminess: 0.5,
                nature: 0.5,
                healing: 0.5,
                freedom: 0.5
            },
            dominantThemes: [],
            userType: 'music-lover',
            preferredContexts: [],
            preferredMovements: [],
            seasonalPreference: null,
            insights: null
        };
    }
    /**
     * Generate and save taste profile for a user
     *
     * @async
     * @param {string} userId - User ID to generate profile for
     * @param {Array<Object>} surveys - All survey records for user
     *
     * @returns {Promise<Object>} Saved taste profile with emotional dimensions
     *
     * @throws {Error} "Failed to generate taste profile: [error details]"
     *
     * Algorithm:
     * 1. Analyze survey data using analyzeEmotionalProfile()
     * 2. Use Prisma upsert to save/update user's taste profile
     * 3. Update: new emotional dimensions and metadata on re-analysis
     * 4. Create: new profile if first time generating
     * 5. Store albumsAnalyzed count for future reference
     *
     * Database fields saved:
     * - All 9 emotional dimensions (0-1 scale)
     * - dominantThemes, userType, preferredContexts, etc.
     * - albumsAnalyzed: count of surveys used
     * - updatedAt: timestamp
     *
     * Called after: User completes 5+ surveys
     * Used by: Recommendation service for personalization
     *
     * @example
     * const profile = await surveyService.generateTasteProfile(userId, surveys);
     * // Stores taste profile in database
     * // Ready for use in recommendation algorithm
     */
    async generateTasteProfile(userId, surveys, spotifyAccessToken) {
        try {
            console.log(`[SURVEY] Generating 13D profile for user ${userId} (${surveys.length} surveys)`);
            // PHASE 3B: Call new 13D user profile service with Spotify token
            // This:
            // 1. Fetches all surveyed albums
            // 2. Gets/computes their 13D embeddings from Last.fm tags (cached)
            // 3. Computes user perception from sliders
            // 4. Calculates deviations (perceived - actual)
            // 5. Averages embeddings for user profile
            // 6. Saves both profile and deviations
            const profile = await user_profile_service_1.userProfileService.generateAndSave13DProfile(userId);
            console.log(`[SURVEY] ✓ Generated and saved 13D profile with deviations`);
            return profile;
        }
        catch (error) {
            throw new Error(`Failed to generate taste profile: ${error.message}`);
        }
    }
}
/**
 * Survey Service instance
 * Singleton exported for use in controllers and other services
 *
 * @type {SurveyService}
 */
exports.surveyService = new SurveyService();
