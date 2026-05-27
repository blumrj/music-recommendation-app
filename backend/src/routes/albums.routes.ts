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

import { Router } from "express";
import { albumController } from "../controllers/albums.controller";
import { surveyController } from "../controllers/survey.controller";
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * Express router instance for album routes
 * @type {Router}
 */
const router = Router();

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
router.post(
  "/:spotifyId/survey",
  authMiddleware,
  (req, res) => surveyController.saveSurvey(req, res)
);

/**
 * Album routes export
 * 
 * @exports router - Express router with album-related endpoints
 */
export default router;
