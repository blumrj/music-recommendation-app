"use strict";
/**
 * Album Routes
 *
 * Maps URL endpoints for album favorites and survey management.
 * Includes endpoints for:
 * - Saving/removing favorite albums
 * - Submitting album surveys (emotional feedback)
 *
 * All routes are protected with authMiddleware - require valid JWT token.
 *
 * @category Routes
 * @module routes/albums
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const albums_controller_1 = require("../controllers/albums.controller");
const survey_controller_1 = require("../controllers/survey.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
/**
 * Express router instance for album routes
 * @type {Router}
 */
const router = (0, express_1.Router)();
/**
 * ===== FAVORITES ENDPOINTS =====
 *
 * Manage user's favorite albums collection
 */
/**
 * GET /api/albums/favorites/all
 * Retrieve all albums that user has marked as favorites
 *
 * @route GET /api/albums/favorites/all
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @returns {Array<Object>} Array of favorite album objects
 * @returns {string} returns[].id - Favorite record ID
 * @returns {string} returns[].albumSpotifyId - Spotify album ID
 * @returns {string} returns[].albumName - Album title
 * @returns {string} returns[].artist - Artist name
 * @returns {string} returns[].imageUrl - Album cover image URL
 * @returns {string} returns[].spotifyUrl - Direct link to Spotify
 * @returns {string} returns[].createdAt - When album was favorited
 */
router.get("/favorites/all", authMiddleware_1.authMiddleware, (req, res) => albums_controller_1.albumController.getFavorites(req, res));
/**
 * POST /api/albums/favorites/save
 * Add an album to user's favorites list
 *
 * Creates a new favorite if it doesn't exist, does nothing if already favorited.
 *
 * @route POST /api/albums/favorites/save
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @param {Object} req.body - Request body (SaveFavoriteDTO)
 * @param {string} req.body.albumSpotifyId - Spotify album ID (required)
 * @param {string} req.body.albumName - Album title (required)
 * @param {string} req.body.artist - Artist name (required)
 * @param {string} req.body.imageUrl - Album cover image URL (optional)
 * @param {string} req.body.spotifyUrl - Spotify album link (required)
 *
 * @returns {Object} Created favorite object
 * @returns {string} returns.id - Favorite record ID
 * @returns {string} returns.createdAt - Timestamp
 *
 * @example
 * POST /api/albums/favorites/save
 * Authorization: Bearer <jwt_token>
 * Content-Type: application/json
 *
 * {
 *   "albumSpotifyId": "spotify_album_id",
 *   "albumName": "Album Title",
 *   "artist": "Artist Name",
 *   "imageUrl": "https://...",
 *   "spotifyUrl": "https://open.spotify.com/album/..."
 * }
 */
router.post("/favorites/save", authMiddleware_1.authMiddleware, (req, res) => albums_controller_1.albumController.saveFavorite(req, res));
/**
 * DELETE /api/albums/favorites/:spotifyId
 * Remove an album from user's favorites
 *
 * @route DELETE /api/albums/favorites/:spotifyId
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @param {string} spotifyId - Spotify album ID to remove (URL parameter)
 *
 * @returns {Object} Success message
 *
 * @example
 * DELETE /api/albums/favorites/spotify_album_id_123
 * Authorization: Bearer <jwt_token>
 */
router.delete("/favorites/:spotifyId", authMiddleware_1.authMiddleware, (req, res) => albums_controller_1.albumController.removeFavorite(req, res));
/**
 * ===== SURVEY ENDPOINTS =====
 *
 * Submit album surveys for taste profile analysis
 */
/**
 * POST /api/albums/:spotifyId/survey
 * Submit survey response for an album
 *
 * Used during onboarding to collect emotional feedback about albums.
 * Helps build user's taste profile through emotional dimensions.
 *
 * @route POST /api/albums/:spotifyId/survey
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * @param {string} spotifyId - Spotify album ID (URL parameter)
 * @param {Object} req.body - Survey response data
 * @param {string} req.body.albumName - Album title (required)
 * @param {string} req.body.artist - Artist name (required)
 * @param {string} req.body.imageUrl - Album cover image URL (optional)
 * @param {Array<string>} req.body.seasons - Seasons when you listen (required array)
 * @param {Array<string>} req.body.emotions - Emotions evoked (required array)
 * @param {Array<string>} req.body.whenYouListen - Listening contexts (required array)
 * @param {string} req.body.movementPreference - Music movement preference (required)
 * @param {Array<string>} req.body.vibe - Vibes/moods (required array)
 * @param {string} req.body.optionalNote - User's optional comment (optional)
 *
 * @returns {Object} Survey submission response
 * @returns {Object} returns.survey - Saved survey record
 * @returns {number} returns.totalSurveys - Total surveys completed by user
 * @returns {boolean} returns.readyForAnalysis - Whether 5+ surveys completed
 *
 * @example
 * POST /api/albums/spotify_album_id_123/survey
 * Authorization: Bearer <jwt_token>
 * Content-Type: application/json
 *
 * {
 *   "albumName": "The Seance",
 *   "artist": "Anathema",
 *   "imageUrl": "https://...",
 *   "seasons": ["autumn", "winter"],
 *   "emotions": ["melancholic", "introspective"],
 *   "whenYouListen": ["studying", "late-night"],
 *   "movementPreference": "post-rock",
 *   "vibe": ["atmospheric", "instrumental"],
 *   "optionalNote": "Great for late night work"
 * }
 */
router.post("/:spotifyId/survey", authMiddleware_1.authMiddleware, (req, res) => survey_controller_1.surveyController.saveSurvey(req, res));
/**
 * Album routes export
 *
 * @exports router - Express router with album-related endpoints
 */
exports.default = router;
