"use strict";
/**
 * User Routes
 *
 * Maps URL endpoints for user profile, surveys, and taste analysis.
 * All routes are protected with authMiddleware - require valid JWT token.
 *
 * ARCHITECTURE:
 * - Routes: Define HTTP endpoints and middleware chain
 * - Controllers: Handle request/response
 * - Services: Handle business logic
 *
 * @category Routes
 * @module routes/users
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("../controllers/users.controller");
const survey_controller_1 = require("../controllers/survey.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
/**
 * Express router instance for user routes
 * @type {Router}
 */
const router = (0, express_1.Router)();
/**
 * GET /api/users/profile
 * Get current user's complete profile with onboarding status
 *
 * @route GET /api/users/profile
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @returns {Object} User profile object
 * @returns {string} returns.id - User's unique ID
 * @returns {string} returns.email - User's email
 * @returns {string} returns.name - User's display name
 * @returns {string} returns.createdAt - Account creation timestamp
 * @returns {boolean} returns.profileGenerated - Whether taste profile exists
 * @returns {number} returns.surveyCount - Number of completed surveys
 * @returns {boolean} returns.needsOnboarding - Whether onboarding required
 * @returns {boolean} returns.readyForAnalysis - Whether 5+ surveys completed
 * @returns {Object|null} returns.tasteProfile - Emotional taste profile (if generated)
 *
 * @example
 * GET /api/users/profile
 * Authorization: Bearer <jwt_token>
 */
router.get("/profile", authMiddleware_1.authMiddleware, (req, res) => users_controller_1.userController.getUserProfile(req, res));
/**
 * GET /api/users/albums-for-survey
 * Get user's saved albums that haven't been surveyed yet
 *
 * @route GET /api/users/albums-for-survey
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @returns {Object} Albums available for survey
 * @returns {Array<Object>} returns.albums - Unsurveyed albums from Spotify library
 * @returns {number} returns.totalCount - Total number of available albums
 * @returns {string} returns.message - Status message
 */
router.get("/albums-for-survey", authMiddleware_1.authMiddleware, (req, res) => survey_controller_1.surveyController.getAvailableAlbumsForSurvey(req, res));
/**
 * GET /api/users/surveyed-albums
 * Get all albums that user has already completed surveys for
 *
 * @route GET /api/users/surveyed-albums
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @returns {Object} Surveyed albums list
 * @returns {Array<Object>} returns.albums - Albums with completed surveys
 * @returns {number} returns.totalCount - Total number of surveyed albums
 */
router.get("/surveyed-albums", authMiddleware_1.authMiddleware, (req, res) => survey_controller_1.surveyController.getSurveyedAlbums(req, res));
/**
 * GET /api/users/taste-profile
 * Get user's current taste profile with emotional dimensions
 *
 * @route GET /api/users/taste-profile
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * Returns null if user hasn't completed 5+ surveys for profile generation
 */
router.get("/taste-profile", authMiddleware_1.authMiddleware, (req, res) => users_controller_1.userController.getTasteProfile(req, res));
/**
 * POST /api/users/analyze-taste
 * Analyze all user's survey responses and generate emotional taste profile
 *
 * @route POST /api/users/analyze-taste
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * Purpose:
 * - Analyzes all completed survey responses from user
 * - Generates emotional taste profile with 9 dimensions
 * - Only available if user has completed 5+ surveys
 *
 * @returns {Object} Taste profile analysis result
 * @returns {Object} returns.profile - Generated taste profile
 * @returns {Object} returns.profile.emotionalProfile - 9 emotional dimensions (0-1 scale)
 * @returns {Array<string>} returns.profile.dominantThemes - Top themes
 * @returns {string} returns.profile.userType - Categorized user type
 *
 * @throws {400} Insufficient surveys (< 5 completed)
 * @throws {500} Analysis failed
 */
router.post("/analyze-taste", authMiddleware_1.authMiddleware, (req, res) => survey_controller_1.surveyController.analyzeTaste(req, res));
/**
 * User routes export
 *
 * @exports router - Express router with user-related endpoints
 */
exports.default = router;
//# sourceMappingURL=users.routes.js.map