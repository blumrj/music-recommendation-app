"use strict";
/**
 * OpenWeatherMap API Client Factory
 *
 * Creates axios instances for OpenWeatherMap API calls with automatic configuration.
 * Handles API key injection, metric units (Celsius), and error logging.
 *
 * All requests automatically include:
 * - OpenWeatherMap API key from environment
 * - Metric units setting (Celsius for temperature)
 * - Error logging interceptor
 *
 * @category Utils
 * @module utils/weather-client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWeatherClient = createWeatherClient;
const axios_1 = __importDefault(require("axios"));
const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
/**
 * Create an axios instance configured for OpenWeatherMap API
 *
 * Automatically adds API key and sets metric units for all requests.
 * Includes error logging interceptor for debugging API issues.
 *
 * @returns {AxiosInstance} Configured axios client with OpenWeatherMap settings
 *
 * @example
 * const client = createWeatherClient();
 * const weather = await client.get('/weather', {
 *   params: { lat: 40.7128, lon: -74.0060 }
 * });
 * // Returns: { weather: [...], main: { temp: 22, ... } }
 */
function createWeatherClient() {
    const client = axios_1.default.create({
        baseURL: OPENWEATHER_BASE_URL,
        params: {
            appid: OPENWEATHER_API_KEY,
            units: "metric", // Use metric units (Celsius)
        },
    });
    // Add response interceptor for error handling
    client.interceptors.response.use((response) => response, (error) => {
        // Log API errors for debugging
        if (error.response?.status) {
            console.error(`OpenWeatherMap API Error: ${error.response.status}`);
        }
        throw error;
    });
    return client;
}
