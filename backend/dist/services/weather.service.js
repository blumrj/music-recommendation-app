"use strict";
/**
 * Weather Service
 *
 * Handles weather fetching and mood categorization.
 * Maps real-time weather conditions to mood categories for recommendations.
 *
 * Key responsibilities:
 * - Fetch weather from OpenWeatherMap API
 * - Map weather conditions to mood categories
 * - Return fallback mood if API fails
 *
 * Mood categories:
 * - sunny: Clear skies, good visibility
 * - rainy: Precipitation, rain
 * - snowy: Snow, frost, winter precipitation
 * - stormy: Thunderstorm, extreme conditions
 * - cloudy: Overcast, no precipitation (default/fallback)
 *
 * @category Services
 * @module services/weather
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.weatherService = exports.WeatherService = void 0;
const weather_client_1 = require("../utils/weather-client");
/**
 * Weather Service
 *
 * Fetches weather data from OpenWeatherMap API and categorizes into mood.
 * All methods are async and degrade gracefully on API failures.
 *
 * @class WeatherService
 */
class WeatherService {
    /**
     * Get weather mood based on geographic location
     *
     * Fetches real-time weather data from OpenWeatherMap API and maps to mood category.
     * Used to provide weather-appropriate music recommendations.
     * Gracefully degrades to "cloudy" if API fails.
     *
     * @async
     * @param {number} latitude - Geographic latitude coordinate
     * @param {number} longitude - Geographic longitude coordinate
     *
     * @returns {Promise<WeatherMood>} Weather mood category
     * - "sunny": Clear skies, good visibility
     * - "rainy": Precipitation/rain conditions
     * - "snowy": Snow, frost, winter precipitation
     * - "stormy": Thunderstorm, extreme weather
     * - "cloudy": Overcast (default/fallback)
     *
     * Weather condition mapping:
     * - OpenWeatherMap "Clear" → "sunny"
     * - OpenWeatherMap "Rain" → "rainy"
     * - OpenWeatherMap "Snow" → "snowy"
     * - OpenWeatherMap "Thunderstorm" → "stormy"
     * - All other conditions → "cloudy"
     * - API errors → "cloudy" (fallback)
     *
     * @example
     * const mood = await weatherService.getWeatherMood(40.7128, -74.0060);
     * console.log(mood); // "sunny" | "rainy" | "snowy" | "stormy" | "cloudy"
     */
    async getWeatherMood(latitude, longitude) {
        try {
            // STAGE 1: Create axios client configured for OpenWeatherMap API
            const weatherClient = (0, weather_client_1.createWeatherClient)();
            // STAGE 2: Fetch current weather data from OpenWeatherMap API
            // Using endpoint: GET /weather with lat/lon parameters
            const response = await weatherClient.get("/weather", {
                params: {
                    lat: latitude,
                    lon: longitude,
                },
            });
            // STAGE 3: Extract weather condition from response
            const data = response.data;
            const weather = data.weather[0].main;
            // STAGE 4: Map OpenWeatherMap condition to our mood category
            let mood = "cloudy"; // Default fallback
            if (weather === "Clear") {
                mood = "sunny";
            }
            else if (weather === "Rain") {
                mood = "rainy";
            }
            else if (weather === "Snow") {
                mood = "snowy";
            }
            else if (weather === "Thunderstorm") {
                mood = "stormy";
            }
            // Otherwise remains "cloudy"
            // STAGE 5: Return the determined mood
            return mood;
        }
        catch (error) {
            console.error("Error fetching weather:", error);
            return "cloudy";
        }
    }
}
exports.WeatherService = WeatherService;
/**
 * Weather Service instance
 * Singleton instance for use throughout app
 *
 * @type {WeatherService}
 */
exports.weatherService = new WeatherService();
