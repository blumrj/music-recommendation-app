"use strict";
/**
 * Weather Controller
 *
 * Handles weather API endpoints.
 * Returns current weather context for a given location.
 *
 * @category Controllers
 * @module controllers/weather
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.weatherController = void 0;
const weather_service_1 = require("../modules/context/weather.service");
/**
 * Weather Controller
 * Endpoint handlers for weather API
 *
 * @class WeatherController
 */
class WeatherController {
    /**
     * Get current weather for location
     *
     * Returns weather data with temporal context (season, time of day)
     * for a given latitude/longitude.
     *
     * @async
     * @param {Request} req - Express request
     * @param {Response} res - Express response
     *
     * @returns {Object} Weather response
     * @returns {string} returns.condition - Weather condition (e.g., "Sunny", "Rainy")
     * @returns {number} returns.temp - Temperature in Celsius
     * @returns {number} returns.humidity - Humidity percentage
     * @returns {string} returns.season - Current season (spring, summer, autumn, winter)
     * @returns {string} returns.timeOfDay - Time of day (morning, afternoon, evening, night)
     *
     * @throws {400} Missing latitude or longitude parameters
     * @throws {500} Failed to fetch weather
     *
     * @example
     * // Request
     * GET /api/weather?lat=40.7128&lon=-74.0060
     *
     * // Response (200 OK)
     * {
     *   condition: "Sunny",
     *   temp: 22.5,
     *   humidity: 65,
     *   season: "summer",
     *   timeOfDay: "afternoon"
     * }
     */
    async getWeather(req, res) {
        try {
            // Extract and validate location parameters
            const { lat, lon } = req.query;
            if (!lat || !lon) {
                return res.status(400).json({
                    error: "Missing latitude and longitude parameters"
                });
            }
            // Fetch weather from service
            const weatherContext = await weather_service_1.weatherService.getWeatherContextWithModifiers(parseFloat(lat), parseFloat(lon));
            // Extract only weather fields for response (exclude contextModifier)
            const weatherResponse = {
                condition: weatherContext.condition,
                temp: weatherContext.temp,
                humidity: weatherContext.humidity,
                season: weatherContext.season,
                timeOfDay: weatherContext.timeOfDay
            };
            res.json(weatherResponse);
        }
        catch (error) {
            res.status(500).json({
                error: "Failed to fetch weather",
                details: error.message
            });
        }
    }
}
/**
 * Weather Controller instance
 * Singleton exported for use in routes
 *
 * @type {WeatherController}
 */
exports.weatherController = new WeatherController();
//# sourceMappingURL=weather.controller.js.map