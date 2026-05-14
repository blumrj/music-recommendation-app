"use strict";
/**
 * Weather Controller
 *
 * Handles HTTP requests for weather mood detection based on geographic coordinates.
 * Delegates weather fetching and mood mapping to weatherService.
 *
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Fetches weather from OpenWeatherMap API and maps to mood categories
 *
 * @category Controllers
 * @module controllers/weather
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.weatherController = exports.WeatherController = void 0;
const weather_service_1 = require("../services/weather.service");
/**
 * Weather Controller
 *
 * Handles HTTP requests for weather mood detection.
 * Weather moods are used by the recommendation engine to contextualize suggestions.
 *
 * @class WeatherController
 */
class WeatherController {
    /**
     * GET /api/weather
     * Fetch weather mood based on geographic coordinates
     *
     * @async
     * @param {Request} req - Express request object with query parameters
     * @param {Response} res - Express response object
     *
     * @param {number} req.query.lat - Latitude coordinate (required)
     * @param {number} req.query.lon - Longitude coordinate (required)
     *
     * Purpose:
     * - Fetch current weather from OpenWeatherMap API
     * - Map weather conditions to mood categories
     * - Used by recommendation engine for context
     *
     * @returns {Object} Weather mood response
     * @returns {string} returns.mood - Mood category: "sunny" | "rainy" | "snowy" | "stormy" | "cloudy"
     * @returns {number} returns.latitude - Provided latitude coordinate
     * @returns {number} returns.longitude - Provided longitude coordinate
     *
     * Mood categories:
     * - sunny: Clear sky, high visibility, comfortable temperature
     * - rainy: Precipitation, rain weather conditions
     * - snowy: Snow, frost, low temperature precipitation
     * - stormy: Thunderstorm, high wind, extreme weather conditions
     * - cloudy: Overcast, partly cloudy, no precipitation
     *
     * @throws {400} Missing or invalid latitude/longitude
     * @throws {500} Failed to fetch weather data
     *
     * @example
     * // Request
     * GET /api/weather?lat=40.7128&lon=-74.0060
     *
     * // Response (200 OK)
     * {
     *   "mood": "sunny",
     *   "latitude": 40.7128,
     *   "longitude": -74.0060
     * }
     */
    async getWeatherMood(req, res) {
        try {
            // STAGE 1: Extract latitude and longitude from query parameters
            const { lat, lon } = req.query;
            // STAGE 2: Validate both coordinates are provided
            if (!lat || !lon) {
                res
                    .status(400)
                    .json({ error: "lat and long query parameters are required" });
                return;
            }
            // STAGE 3: Convert query string parameters to numbers (they arrive as strings)
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lon);
            // STAGE 4: Call service to fetch weather data and determine mood
            const mood = await weather_service_1.weatherService.getWeatherMood(latitude, longitude);
            // STAGE 5: Return mood with coordinates to caller
            res.json({ mood, latitude, longitude });
        }
        catch (error) {
            console.error("Error getting error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.WeatherController = WeatherController;
/**
 * Weather Controller instance
 * Singleton instance for use in routes
 *
 * @type {WeatherController}
 */
exports.weatherController = new WeatherController();
