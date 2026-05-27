"use strict";
/**
 * User Controller
 *
 * Handles HTTP requests for user profile and taste profile endpoints.
 * Delegates business logic to userService and surveyService.
 *
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Handles database operations and business logic
 *
 * @category Controllers
 * @module controllers/users
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = exports.UserController = void 0;
const users_service_1 = require("../modules/users/users.service");
const survey_service_1 = require("../modules/surveys/survey.service");
/**
 * User Controller
 *
 * Handles HTTP requests related to user profiles, taste analysis, and preferences.
 * All methods are async and assume authMiddleware has already validated JWT.
 *
 * @class UserController
 */
class UserController {
    /**
     * GET /api/users/profile
     * Get authenticated user's profile with onboarding status and taste analysis data
     *
     * Authentication: Required (JWT token via authMiddleware)
     *
     * Returns:
     * - User basic info: id, email, name, createdAt
     * - Profile status: profileGenerated, surveyCount, needsOnboarding, readyForAnalysis
     * - Taste data: tasteProfile with emotional dimensions and analysis insights
     *
     */
    async getUserProfile(req, res) {
        try {
            // STAGE 1: Extract from request
            const userId = req.userId;
            // STAGE 2: Validate
            const user = await users_service_1.userService.getUserById(userId);
            if (!user) {
                res.status(404).json({ error: "User not found" });
                return;
            }
            // STAGE 3: Call service
            const profile = await users_service_1.userService.getTasteProfile(userId);
            const surveyCount = await survey_service_1.surveyService.getCompletedSurveyCount(userId);
            // If user has a profile, they've completed onboarding
            const needsOnboarding = profile === null && surveyCount === 0;
            // STAGE 4: Return response
            res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                createdAt: user.createdAt,
                profileGenerated: profile !== null,
                surveyCount,
                needsOnboarding,
                readyForAnalysis: surveyCount >= 5,
                tasteProfile: profile ? {
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
                    movement: profile.movement,
                    albumsAnalyzed: profile.albumsAnalyzed,
                } : null,
            });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * GET /api/users/taste-profile
     * Retrieve user's current taste profile with emotional dimensions
     *
     * Only available if user has completed 5+ album surveys to generate profile.
     *
     * @async
     * @param {Request} req - Express request object with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * @returns {Object} UserTasteProfile
     * @returns {number} returns.nature - Nature dimension score (0-1)
     * @returns {number} returns.introspection - Introspection dimension score (0-1)
     * @returns {number} returns.movement - Movement dimension score (0-1)
     * @returns {number} returns.healing - Healing dimension score (0-1)
     * @returns {number} returns.melancholy - Melancholy dimension score (0-1)
     * @returns {number} returns.freedom - Freedom dimension score (0-1)
     * @returns {number} returns.energyLevel - Energy level dimension score (0-1)
     * @returns {number} returns.coziness - Coziness dimension score (0-1)
     * @returns {number} returns.dreaminess - Dreaminess dimension score (0-1)
     * @returns {Array<string>} returns.dominantThemes - Top themes (e.g., ["introspective", "melodic"])
     * @returns {string} returns.userType - Categorized user type (e.g., "contemplative-explorer")
     * @returns {string} returns.insights - AI-generated text insights about taste
     * @returns {Array<string>} returns.preferredContexts - When they like to listen
     * @returns {Array<string>} returns.preferredMovements - Preferred music movements
     * @returns {string} returns.seasonalPreference - Favorite season for this music
     *
     * @throws {404} Taste profile not yet generated
     * @throws {500} Failed to fetch taste profile
     *
     * @example
     * // Request
     * GET /api/users/taste-profile
     * Authorization: Bearer <jwt_token>
     *
     * // Response (200 OK)
     * {
     *   nature: 0.82,
     *   introspection: 0.75,
     *   movement: 0.45,
     *   healing: 0.88,
     *   melancholy: 0.62,
     *   freedom: 0.71,
     *   energyLevel: 0.35,
     *   coziness: 0.89,
     *   dreaminess: 0.78,
     *   dominantThemes: ["introspective", "melodic", "atmospheric"],
     *   userType: "contemplative-explorer",
     *   insights: "You prefer instrumental...",
     *   preferredContexts: ["studying", "relaxing"],
     *   preferredMovements: ["ambient", "post-rock"],
     *   seasonalPreference: "autumn"
     * }
     */
    async getTasteProfile(req, res) {
        try {
            // Extract user ID from JWT token
            const userId = req.userId;
            // Fetch user's taste profile from service
            const profile = await users_service_1.userService.getTasteProfile(userId);
            // If user hasn't completed analysis yet, profile won't exist
            if (!profile) {
                return res.status(404).json({
                    error: "Taste profile not yet generated",
                    message: "Complete 5+ album surveys to generate your taste profile"
                });
            }
            // Return the complete profile with all emotional dimensions
            res.json(profile);
        }
        catch (error) {
            console.error("Error fetching taste profile:", error.message);
            res.status(500).json({
                error: "Failed to fetch taste profile",
                details: error.message
            });
        }
    }
}
exports.UserController = UserController;
/**
 * User Controller instance
 * Singleton instance for use in routes
 *
 * @type {UserController}
 */
exports.userController = new UserController();
