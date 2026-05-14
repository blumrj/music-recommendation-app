/**
 * Recommendation Controller
 * 
 * Handles HTTP requests for weather-based music recommendations.
 * Delegates recommendation generation algorithm to recommendationService.
 * 
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Handles recommendation algorithm, caching, and external API calls
 * 
 * SEPARATION OF CONCERNS:
 * - Controller: "What HTTP stuff do I need to do?"
 * - Service: "What's the actual algorithm?"
 * 
 * Benefit: Can test service independently, can swap controller HTTP framework
 * 
 * @category Controllers
 * @module controllers/recommendation
 */

import { Request, Response } from "express";
import { recommendationService } from "../services/recommendation.service";
import { userService } from "../services/users.service";

/**
 * Recommendation Controller
 * 
 * Handles HTTP requests for generating music recommendations based on weather.
 * Weather is determined by user's geographic coordinates.
 * 
 * @class RecommendationController
 */
class RecommendationController {
  /**
   * GET /api/recommendations?lat=X&lon=Y
   * Generate weather-based music recommendations
   * 
   * @async
   * @param {Request} req - Express request object with userId from authMiddleware
   * @param {Response} res - Express response object
   * 
   * @param {number} req.query.lat - User's latitude coordinate (required)
   * @param {number} req.query.lon - User's longitude coordinate (required)
   * 
   * Algorithm flow:
   * 1. Extract HTTP data (query params, auth info via middleware)
   * 2. Validate latitude and longitude parameters
   * 3. Get user's Spotify credentials from database
   * 4. Delegate to service for recommendation generation:
   *    - Check cache (same location, same day?)
   *    - If cached, return immediately with cached: true
   *    - If not cached:
   *      * Fetch weather from OpenWeatherMap API
   *      * Get user's taste profile (emotional preferences)
   *      * Blend user profile with weather (60% user / 40% weather)
   *      * Generate Spotify search keywords
   *      * Search Spotify for candidate albums
   *      * Score albums by keyword match + popularity
   *      * Select top 3 recommendations
   *      * Cache the results
   * 5. Return recommendations with weather info and cache status
   * 
   * @returns {Object} Recommendations response
   * @returns {Array<Object>} returns.recommendations - Top 3 album recommendations
   * @returns {string} returns.recommendations[].id - Spotify album ID
   * @returns {string} returns.recommendations[].name - Album name
   * @returns {string} returns.recommendations[].artist - Artist name
   * @returns {string} returns.recommendations[].image - Album cover URL
   * @returns {string} returns.recommendations[].spotifyUrl - Spotify link
   * @returns {string} returns.mood - Weather mood (sunny, rainy, snowy, stormy, cloudy)
   * @returns {Object} returns.weather - Weather data from OpenWeatherMap
   * @returns {boolean} returns.cached - Whether result was from cache
   * @returns {string} returns.generatedAt - Timestamp of generation
   * 
   * @throws {400} Missing latitude or longitude parameters
   * @throws {401} User not authenticated with Spotify
   * @throws {404} User not found
   * @throws {500} Failed to generate recommendations
   * 
   * @example
   * // Request
   * GET /api/recommendations?lat=40.7128&lon=-74.0060
   * Authorization: Bearer <jwt_token>
   * 
   * // Response (200 OK)
   * {
   *   recommendations: [
   *     { id: "abc123", name: "Album 1", artist: "Artist 1", image: "url", spotifyUrl: "url" }
   *   ],
   *   mood: "energetic",
   *   weather: { temp: 22, condition: "sunny", humidity: 65 },
   *   cached: false,
   *   generatedAt: "2026-05-08T10:30:00Z"
   * }
   */
  async getRecommendations(req: Request, res: Response) {
    try {
      /**
       * STEP 1: EXTRACT HTTP DATA
       * authMiddleware already validated the JWT, so req.userId is safe to use
       */
      const userId = (req as any).userId;

      /**
       * STEP 2: EXTRACT LOCATION FROM QUERY PARAMS
       * Location is used for:
       * - Weather API call (OpenWeatherMap)
       * - Cache key (so different locations get different recommendations)
       */
      const { lat, lon } = req.query;

      /**
       * STEP 3: VALIDATE INPUT
       * Both latitude and longitude are required for weather lookup
       * Frontend should provide these, but we validate here for safety
       */
      if (!lat || !lon) {
        return res.status(400).json({
          error: "Missing latitude and longitude parameters"
        });
      }

      /**
       * STEP 4: GET USER'S SPOTIFY CREDENTIALS
       * Why we need this:
       * - Get user's Spotify access token (needed to call Spotify API)
       * - Get user's Spotify refresh token (in case access token expired)
       * - Verify user exists and has Spotify auth (validation)
       * 
       * ARCHITECTURE: Delegate to service (SoC - service handles DB)
       * NOT in controller (which only handles HTTP)
       */
      let userCredentials;
      try {
        userCredentials = await userService.getUserSpotifyCredentials(userId);
      } catch (error: any) {
        // Service throws specific errors we can translate to HTTP responses
        if (error.message.includes("not found")) {
          return res.status(404).json({ error: "User not found" });
        }
        if (error.message.includes("not authenticated")) {
          return res.status(401).json({
            error: "User not authenticated with Spotify. Please connect your Spotify account."
          });
        }
        throw error;  // Re-throw other errors to catch block
      }
      
      /**
       * STEP 5: DELEGATE TO SERVICE
       * 
       * What the service will do:
       * 1. Check cache (same location, same day?)
       * 2. If cached, return immediately
       * 3. If not cached:
       *    - Fetch weather from OpenWeatherMap
       *    - Get user's taste profile (emotional preferences)
       *    - Blend user profile with weather context (60% user / 40% weather)
       *    - Generate Spotify search keywords based on blended profile
       *    - Search Spotify for ~100 candidate albums
       *    - Score each album by keyword matching + Spotify popularity
       *    - Select top 3 recommendations
       *    - Cache the results
       * 
       * Response will include: recommendations, weather info, mood, cache status
       */
      const recommendations = await recommendationService.generateRecommendations(
        userCredentials.spotifyToken,      // Access token for Spotify API calls
        parseFloat(lat as string),  // User's latitude
        parseFloat(lon as string),  // User's longitude
        userId,                 // For database operations and cache key
        userCredentials.spotifyRefreshToken  // In case token refresh needed
      );

      /**
       * STEP 6: RETURN RECOMMENDATIONS TO FRONTEND
       * Response includes:
       * - Top 3 albums with all metadata (id, name, artist, image, spotifyUrl)
       * - Weather information
       * - Detected mood type
       * - Cache status (helpful for debugging)
       * - Generated timestamp
       */
      res.json(recommendations);
    } catch (error: any) {
      // Default error response (Generic server error)
      let statusCode = 500;
      let errorMessage = "Failed to generate recommendations";
      
      /**
       * ERROR TYPE DETECTION
       * Check error message to categorize the problem and provide specific feedback to frontend.
       * This helps the frontend show better error messages to users instead of generic errors.
       */
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        // Spotify token authentication issue
        statusCode = 401;
        errorMessage = "Spotify authentication failed. Please log in again.";
      } else if (error.message.includes("weather")) {
        // Weather API failed (OpenWeatherMap API issue)
        errorMessage = "Failed to fetch weather data. Please try again.";
      } else if (error.message.includes("location")) {
        // Invalid location parameters
        statusCode = 400;
        errorMessage = "Location is required to get recommendations.";
      } else if (error.message.includes("token")) {
        // Token expiration or refresh failure
        statusCode = 401;
        errorMessage = "Authentication token expired. Please log in again.";
      }
      
      res.status(statusCode).json({
        error: errorMessage,              // User-friendly error message for UI display
        details: error.message            // Technical details for debugging
      });
    }
  }
}

/**
 * Recommendation Controller instance
 * Singleton instance for use in routes
 * 
 * @type {RecommendationController}
 */
export const recommendationController = new RecommendationController();
