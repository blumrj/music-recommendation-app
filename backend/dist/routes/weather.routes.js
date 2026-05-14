"use strict";
/**
 * Weather Routes
 *
 * Maps URL endpoint for weather mood detection based on geographic coordinates.
 * Used by recommendation engine to suggest weather-appropriate albums.
 *
 * ARCHITECTURE:
 * - Routes: Define HTTP endpoints
 * - Controller: Handle HTTP request/response
 * - Service: Fetch weather from OpenWeatherMap API and map to mood
 *
 * @category Routes
 * @module routes/weather
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const weather_controller_1 = require("../controllers/weather.controller");
/**
 * Express router instance for weather routes
 * @type {Router}
 */
const router = (0, express_1.Router)();
/**
 * GET /api/weather
 * Get weather mood category based on geographic coordinates
 *
 * Fetches current weather from OpenWeatherMap API and maps to mood categories.
 * Used by recommendation engine to contextualize music suggestions.
 *
 * @route GET /api/weather
 * @access Public - No authentication required
 *
 * @param {number} lat - Latitude coordinate (query parameter, required)
 * @param {number} lon - Longitude coordinate (query parameter, required)
 *
 * @returns {Object} Weather mood response
 * @returns {string} returns.mood - Mood category: "sunny" | "rainy" | "snowy" | "stormy" | "cloudy"
 * @returns {number} returns.latitude - Provided latitude
 * @returns {number} returns.longitude - Provided longitude
 *
 * Mood mapping logic:
 * - "sunny": Clear sky, high visibility, good temperature
 * - "rainy": Precipitation, rain weather conditions
 * - "snowy": Snow, frost, low temperature precipitation
 * - "stormy": Thunderstorm, high wind, extreme conditions
 * - "cloudy": Overcast, partly cloudy, no precipitation
 *
 * @example
 * GET /api/weather?lat=40.7128&lon=-74.0060
 *
 * Response:
 * {
 *   "mood": "sunny",
 *   "latitude": 40.7128,
 *   "longitude": -74.0060
 * }
 *
 * @throws {400} Missing latitude or longitude parameters
 * @throws {500} Failed to fetch weather data from API
 */
router.get("/", (req, res) => weather_controller_1.weatherController.getWeatherMood(req, res));
/**
 * Weather routes export
 *
 * @exports router - Express router with weather endpoints
 */
exports.default = router;
