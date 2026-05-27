"use strict";
/**
 * Survey Controller
 *
 * Handles HTTP requests for album surveys and taste profile generation.
 * Manages the onboarding workflow and emotional preference analysis.
 *
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Handles database operations and analysis logic
 * - Surveys: User's emotional feedback about albums (emotions, seasons, contexts, etc.)
 * - Taste Profile: Aggregated 9-dimensional emotional profile from 5+ surveys
 *
 * Survey workflow:
 * 1. User saves albums on Spotify
 * 2. Complete survey for each album (emotions, seasons, vibes, etc.)
 * 3. After 5+ surveys: Generate taste profile (analyze emotional patterns)
 * 4. Use taste profile for personalized recommendations
 *
 * @category Controllers
 * @module controllers/survey
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.surveyController = void 0;
const client_1 = require("@prisma/client");
const survey_service_1 = require("../modules/surveys/survey.service");
const users_service_1 = require("../modules/users/users.service");
const prisma = new client_1.PrismaClient();
/**
 * Survey Controller
 *
 * Handles HTTP requests for survey submission, taste analysis, and album management.
 * All methods are async and assume authMiddleware has validated JWT.
 *
 * @class SurveyController
 */
class SurveyController {
    /**
     * POST /api/albums/:spotifyId/survey
     * Save user's emotional survey response about an album
     *
     * Supports TWO formats:
     * - Phase 1: 6-slider responses (intimacy_response, warmth_response, etc.)
     * - Phase 0: Multi-select fields (seasons, emotions, etc.) [deprecated, backward compatibility only]
     *
     * @async
     * @param {Request} req - Express request with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * @param {string} req.params.spotifyId - Spotify album ID (from URL)
     * @param {Object} req.body - Survey data (must include one format or both)
     * @param {string} req.body.albumName - Album title (required)
     * @param {string} req.body.artist - Artist name (required)
     * @param {string} req.body.imageUrl - Album cover URL (optional)
     *
     * PHASE 1 FORMAT (Preferred):
     * @param {number} req.body.intimacy_response - 0-100, where 0=intimate, 100=distant
     * @param {number} req.body.warmth_response - 0-100, where 0=warm, 100=cold
     * @param {number} req.body.groundedness_response - 0-100, where 0=grounded, 100=dreamy
     * @param {number} req.body.arousal_response - 0-100, where 0=calm, 100=energized
     * @param {number} req.body.introspection_response - 0-100, where 0=reflective, 100=external
     * @param {number} req.body.density_response - 0-100, where 0=dense, 100=sparse
     *
     * PHASE 0 FORMAT (Backward compatibility):
     * @param {Array<string>} req.body.seasons - Seasons when user listens (optional)
     * @param {Array<string>} req.body.emotions - Emotions evoked by album (optional)
     * @param {Array<string>} req.body.whenYouListen - Listening contexts (optional)
     * @param {string} req.body.movementPreference - Music movement (optional if using Phase 1)
     * @param {Array<string>} req.body.vibe - Vibes/moods (optional)
     * @param {string} req.body.optionalNote - User's personal comment (optional)
     *
     * @returns {Object} Survey response
     * @returns {Object} returns.survey - Saved survey record
     * @returns {number} returns.totalSurveys - Total surveys completed by user
     * @returns {boolean} returns.readyForAnalysis - Whether 5+ surveys completed
     *
     * @throws {400} Missing spotifyId, albumName, or artist
     * @throws {400} Must provide Phase 1 sliders OR Phase 0 fields
     * @throws {400} Invalid slider values (not 0-100)
     * @throws {500} Database error
     *
     * @example
     * // PHASE 1 (Preferred)
     * POST /api/albums/spotify_id_123/survey
     * Authorization: Bearer <token>
     *
     * {
     *   albumName: "Album Title",
     *   artist: "Artist Name",
     *   imageUrl: "url...",
     *   intimacy_response: 35,
     *   warmth_response: 72,
     *   groundedness_response: 45,
     *   arousal_response: 60,
     *   introspection_response: 55,
     *   density_response: 48
     * }
     *
     * @example
     * // PHASE 0 (Backward compatibility)
     * POST /api/albums/spotify_id_456/survey
     * Authorization: Bearer <token>
     *
     * {
     *   albumName: "Another Album",
     *   artist: "Another Artist",
     *   seasons: ["autumn", "winter"],
     *   emotions: ["melancholic"],
     *   whenYouListen: ["studying"],
     *   movementPreference: "reflect",
     *   vibe: ["atmospheric"]
     * }
     */
    async saveSurvey(req, res) {
        try {
            // Extract user ID from JWT token (set by authMiddleware)
            const userId = req.userId;
            // Extract Spotify album ID from URL param
            const { spotifyId } = req.params;
            // Extract survey answers from request body
            const { albumName, artist, imageUrl, 
            // Old Phase 0 format (optional, for backward compatibility)
            seasons, emotions, whenYouListen, movementPreference, vibe, optionalNote, 
            // New Phase 1 format (slider responses 0-100, 7D dimensions)
            valence_response, arousal_response, tension_response, warmth_response, intimacy_response, density_response, groundedness_response } = req.body;
            // Validate required fields are present
            if (!spotifyId || !albumName || !artist) {
                return res.status(400).json({
                    error: "Missing required fields: spotifyId, albumName, artist"
                });
            }
            // Determine which format is being used
            const isPhase1Format = valence_response !== undefined || arousal_response !== undefined;
            const isPhase0Format = seasons !== undefined || emotions !== undefined;
            // Require at least one format
            if (!isPhase1Format && !isPhase0Format) {
                return res.status(400).json({
                    error: "Must provide either Phase 1 sliders (valence_response, arousal_response, tension_response, warmth_response, intimacy_response, density_response, groundedness_response) or Phase 0 fields (seasons, emotions, etc.)"
                });
            }
            // Validate Phase 0 format if provided (for backward compatibility)
            if (isPhase0Format) {
                if (!Array.isArray(seasons) || !Array.isArray(emotions) || !Array.isArray(whenYouListen) || !Array.isArray(vibe)) {
                    return res.status(400).json({
                        error: "When using Phase 0 format: seasons, emotions, whenYouListen, vibe must be arrays"
                    });
                }
                if (!movementPreference) {
                    return res.status(400).json({
                        error: "When using Phase 0 format: movementPreference is required"
                    });
                }
            }
            // Validate Phase 1 format if provided (all sliders should be 0-100 if sent)
            if (isPhase1Format) {
                const sliders = [valence_response, arousal_response, tension_response, warmth_response, intimacy_response, density_response, groundedness_response];
                for (const slider of sliders) {
                    if (slider !== undefined && (typeof slider !== 'number' || slider < 0 || slider > 100)) {
                        return res.status(400).json({
                            error: "Phase 1 sliders must be numbers between 0-100"
                        });
                    }
                }
            }
            // Save or update survey in database
            const survey = await survey_service_1.surveyService.saveSurveyResponse({
                userId,
                spotifyAlbumId: spotifyId,
                albumName,
                artist,
                imageUrl,
                // Old fields (will be undefined if using Phase 1 format)
                seasons,
                emotions,
                whenYouListen,
                movementPreference,
                vibe,
                optionalNote,
                // New fields (will be undefined if using Phase 0 format) - 7D dimensions
                valence_response,
                arousal_response,
                tension_response,
                warmth_response,
                intimacy_response,
                density_response,
                groundedness_response
            });
            // Count how many surveys this user has completed
            const totalSurveys = await survey_service_1.surveyService.getCompletedSurveyCount(userId);
            // Return saved survey + progress info
            res.status(201).json({
                survey,
                totalSurveys,
                readyForAnalysis: totalSurveys >= 5 // Can analyze taste if 5+ surveys
            });
        }
        catch (error) {
            console.error("Error saving survey:", error.message);
            res.status(500).json({
                error: "Failed to save survey",
                details: error.message
            });
        }
    }
    /**
     * POST /api/users/analyze-taste
     * Analyze all surveys and generate emotional taste profile
     *
     * @async
     * @param {Request} req - Express request with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * Purpose:
     * Analyzes completed survey responses and generates 9-dimensional emotional profile.
     * Only available after user completes 5+ surveys. Used for personalized recommendations.
     *
     * Emotional dimensions (0-1 scale):
     * 1. Nature - Organic/acoustic preferences
     * 2. Introspection - Reflective/thoughtful preferences
     * 3. Movement - Danceable/rhythmic preferences
     * 4. Healing - Soothing/therapeutic preferences
     * 5. Melancholy - Emotional/sad preferences
     * 6. Freedom - Expansive/liberating preferences
     * 7. Energy Level - Intense/energetic preferences
     * 8. Coziness - Warm/intimate preferences
     * 9. Dreaminess - Ethereal/otherworldly preferences
     *
     * @returns {Object} Analysis result
     * @returns {string} returns.message - Success message
     * @returns {Object} returns.profile - Taste profile
     * @returns {Object} returns.profile.emotionalProfile - 9D emotional space
     * @returns {Array<string>} returns.profile.dominantThemes - Top themes
     * @returns {string} returns.profile.userType - User categorization
     * @returns {Array<string>} returns.profile.preferredContexts - Listening contexts
     * @returns {Array<string>} returns.profile.preferredMovements - Music movements
     * @returns {string} returns.profile.seasonalPreference - Favorite season
     * @returns {string} returns.profile.insights - AI insights text
     * @returns {number} returns.profile.albumsAnalyzed - Albums analyzed
     *
     * @throws {400} Insufficient surveys (< 5)
     * @throws {400} No surveys found
     * @throws {500} Analysis failed
     */
    async analyzeTaste(req, res) {
        try {
            // Extract user ID from JWT token (set by authMiddleware)
            const userId = req.userId;
            // Fetch user to get Spotify token
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { spotifyToken: true }
            });
            console.log(`[SURVEY] analyzeTaste called for user ${userId}`);
            console.log(`[SURVEY] User has spotifyToken:`, !!user?.spotifyToken);
            if (user?.spotifyToken) {
                console.log(`[SURVEY] Token preview:`, user.spotifyToken.substring(0, 20) + '...');
                console.log(`[SURVEY] Token length:`, user.spotifyToken.length);
            }
            if (!user?.spotifyToken) {
                return res.status(400).json({
                    error: "No Spotify token found. Please re-authenticate."
                });
            }
            // Get total number of surveys user has completed
            const surveyCount = await survey_service_1.surveyService.getCompletedSurveyCount(userId);
            // Validation: Need at least 5 surveys to build a meaningful profile
            if (surveyCount < 5) {
                return res.status(400).json({
                    error: `Not enough surveys to analyze. Need at least 5, have ${surveyCount}`,
                    surveysNeeded: 5 - surveyCount
                });
            }
            // Fetch all individual survey responses from database
            const surveys = await survey_service_1.surveyService.getAllSurveys(userId);
            // Safety check: Make sure we actually got surveys back
            if (surveys.length === 0) {
                return res.status(400).json({
                    error: "No surveys found to analyze",
                    surveysCount: 0
                });
            }
            // Analyze surveys and generate taste profile with Spotify token
            // This computes actual 13D embeddings + deviations
            const profile = await survey_service_1.surveyService.generateTasteProfile(userId, surveys, user.spotifyToken);
            // Return the complete taste profile to frontend
            res.json({
                message: "Taste profile analyzed successfully",
                profile: {
                    emotionalProfile: {
                        valence: profile.valence,
                        arousal: profile.arousal,
                        tension: profile.tension,
                        warmth: profile.warmth,
                        intimacy: profile.intimacy,
                        density: profile.density,
                        spaciousness: profile.spaciousness,
                        organicSynthetic: profile.organicSynthetic,
                        nostalgia: profile.nostalgia,
                        groundedness: profile.groundedness,
                        introspection: profile.introspection,
                        movement: profile.movement
                    },
                    albumsAnalyzed: profile.albumsAnalyzed
                }
            });
        }
        catch (error) {
            console.error("Error analyzing taste:", error.message);
            res.status(500).json({
                error: "Failed to analyze taste profile",
                details: error.message
            });
        }
    }
    /**
     * GET /api/users/albums-for-survey
     * Get unsurveyed albums from user's Spotify library
     *
     * @async
     * @param {Request} req - Express request with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * Flow:
     * 1. Get userId from JWT (via authMiddleware)
     * 2. Validate user exists and has Spotify token
     * 3. Fetch user's saved albums from Spotify (up to 15)
     * 4. Get albums user already surveyed
     * 5. Filter: return only unsurveyed albums
     * 6. Return available albums for user to survey
     *
     * @returns {Object} Albums available for survey
     * @returns {Array<Object>} returns.albums - Unsurveyed albums
     * @returns {string} returns.albums[].spotifyId - Spotify album ID
     * @returns {string} returns.albums[].name - Album title
     * @returns {string} returns.albums[].artist - Artist name
     * @returns {string} returns.albums[].imageUrl - Album cover URL
     * @returns {string} returns.albums[].spotifyUrl - Spotify link
     * @returns {number} returns.totalCount - Number of available albums
     * @returns {string} returns.message - Status message
     *
     * @throws {404} User not found
     * @throws {400} Spotify token not available
     * @throws {500} Error fetching albums
     *
     * @example
     * GET /api/users/albums-for-survey
     * Authorization: Bearer <token>
     *
     * Response: { albums: [...], totalCount: 3, message: "Found 3 albums..." }
     */
    async getAvailableAlbumsForSurvey(req, res) {
        try {
            // STAGE 1: Extract from request
            const userId = req.userId;
            // STAGE 2: Validate
            const user = await users_service_1.userService.getUserById(userId);
            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            if (!user.spotifyToken) {
                res.status(400).json({
                    error: "Spotify token not available. Please re-authenticate.",
                });
                return;
            }
            // STAGE 3: Call service
            const albums = await survey_service_1.surveyService.getAvailableAlbumsForSurvey(user.spotifyToken, userId, 15);
            // STAGE 4: Return response
            res.json({
                albums,
                totalCount: albums.length,
                message: `Found ${albums.length} of your saved albums. Let's analyze your taste!`,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /api/users/surveyed-albums
     * Get albums user has already surveyed
     *
     * @async
     * @param {Request} req - Express request with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * Purpose:
     * - Display user's completed surveys
     * - Show albums that contributed to taste profile
     * - Used in profile page and onboarding completion
     *
     * @returns {Object} Surveyed albums list
     * @returns {Array<Object>} returns.albums - Albums user surveyed
     * @returns {string} returns.albums[].spotifyId - Spotify album ID
     * @returns {string} returns.albums[].name - Album title
     * @returns {string} returns.albums[].artist - Artist name
     * @returns {string} returns.albums[].imageUrl - Album cover
     * @returns {number} returns.totalCount - Total surveyed albums (max 10 returned)
     *
     * @throws {500} Error fetching surveyed albums
     *
     * @example
     * GET /api/users/surveyed-albums
     * Authorization: Bearer <token>
     *
     * Response: { albums: [...], totalCount: 5 }
     */
    async getSurveyedAlbums(req, res) {
        try {
            // STAGE 1: Extract from request
            const userId = req.userId;
            // STAGE 3: Call service (no validation needed, userId is guaranteed valid)
            const albums = await survey_service_1.surveyService.getSurveyedAlbums(userId, 10);
            // STAGE 4: Return response
            res.json({
                albums,
                totalCount: albums.length,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.surveyController = new SurveyController();
