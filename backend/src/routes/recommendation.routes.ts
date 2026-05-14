/**
 * Recommendation Routes
 * 
 * Maps URL endpoints to recommendation controller handlers.
 * Defines GET /api/recommendations route for weather-based music recommendations.
 * 
 * ARCHITECTURE:
 * - Routes = URL + HTTP method + middleware + handler
 * - This file ONLY maps URLs to handlers
 * - No logic here!
 * 
 * @category Routes
 * @module routes/recommendation
 */

import { Router } from "express";
import { recommendationController } from "../controllers/recommendation.controller";
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * Express router instance for recommendation routes
 * @type {Router}
 */
const router = Router();

/**
 * GET /api/recommendations
 * 
 * Retrieves weather-based music recommendations for a user at a specific location.
 * 
 * @route GET /api/recommendations
 * @param {number} lat - User's latitude (query parameter)
 * @param {number} lon - User's longitude (query parameter)
 * @access Private - Requires valid JWT token
 * @middleware authMiddleware - Validates JWT and extracts userId
 * 
 * @returns {Object} Recommendation response object
 * @returns {string} returns.mood - Weather mood type (e.g., "energetic", "cozy")
 * @returns {Object} returns.weather - Weather data (temperature, condition, humidity)
 * @returns {Array<Object>} returns.recommendations - Top 3 weather-based albums
 * @returns {string} returns.recommendations[].id - Spotify album ID
 * @returns {string} returns.recommendations[].name - Album name
 * @returns {string} returns.recommendations[].artist - Artist name
 * @returns {string} returns.recommendations[].image - Album artwork URL
 * @returns {string} returns.recommendations[].spotifyUrl - Link to Spotify
 * @returns {boolean} returns.cached - Whether result was from cache
 * @returns {string} returns.generatedAt - Timestamp of generation
 * 
 * @description
 * Recommendation discovery process:
 * - Top 3 recommendations are weather-mood based
 * - Discovered via seed artists + Spotify search
 * 
 * Caching behavior:
 * - Results cached per user, per location (rounded to 1 decimal), per day
 * - Same user + location + day = instant cached response
 * - Different location or new day = fresh weather + new recommendations
 * 
 * @example
 * // Request
 * GET /api/recommendations?lat=40.7128&lon=-74.0060
 * Authorization: Bearer <jwt_token>
 * 
 * // Response (200 OK)
 * {
 *   mood: "energetic",
 *   weather: { temp: 22, condition: "sunny", humidity: 65 },
 *   recommendations: [
 *     { id: "abc123", name: "Album 1", artist: "Artist 1", image: "url", spotifyUrl: "url" }
 *   ],
 *   cached: false,
 *   generatedAt: "2026-05-08T10:30:00Z"
 * }
 */
router.get(
  "/recommendations",
  authMiddleware,
  recommendationController.getRecommendations.bind(recommendationController)
);

/**
 * Recommendation routes export
 * 
 * @exports router - Express router with recommendation endpoints
 */
export default router;
