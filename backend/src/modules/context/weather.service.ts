/**
 * Weather Service
 * 
 * Handles weather API integration and context fetching.
 * Delegates all context computation to contextModifierService.
 * 
 * Key responsibilities:
 * - Fetch weather from OpenWeatherMap API
 * - Pass raw weather to contextModifierService
 * 
 * ARCHITECTURE:
 * weather.service = API Integration Layer (thin)
 * context-modifier.service = Business Logic Layer (self-contained)
 * 
 * @category Services
 * @module services/weather
 */

import { createWeatherClient } from "../../infrastructure/weather/weather-client";
import { contextModifierService } from "./context-modifier.service";

/**
 * Weather Service
 * 
 * Responsible for fetching weather data from OpenWeatherMap API.
 * Delegates all contextual computation to contextModifierService which is fully self-contained.
 * 
 * Single responsibility: API integration only
 * 
 * @class WeatherService
 */
export class WeatherService {
  private weatherClient = createWeatherClient();

  /**
   * Fetch current weather from OpenWeatherMap API
   * 
   * @private
   * @async
   * @param {number} lat - Latitude coordinate
   * @param {number} lon - Longitude coordinate
   * @returns {Promise<Object>} Raw OpenWeatherMap response data
   * @throws {Error} If API call fails
   */
  private async fetchWeather(lat: number, lon: number): Promise<any> {
    const response = await this.weatherClient.get("/weather", {
      params: { lat, lon, timeout: 10000 }
    });
    return response.data;
  }

  /**
   * Get weather context with emotional dimension modifiers
   * 
   * Fetches raw weather data from API and delegates all context computation
   * to contextModifierService (which is fully self-contained and computes time/season/precipitation internally).
   * 
   * @async
   * @param {number} lat - Latitude coordinate
   * @param {number} lon - Longitude coordinate
   * 
   * @returns {Promise<Object>} Weather data with emotional context
   * @returns {string} returns.condition - OpenWeatherMap condition (e.g., "Rainy", "Sunny")
   * @returns {number} returns.temp - Temperature in Celsius
   * @returns {Object} returns.contextModifier - Emotional dimension modifiers
   * @returns {number} returns.humidity - Humidity percentage
   * @returns {string} returns.season - Current season (computed by contextModifierService)
   * @returns {string} returns.timeOfDay - Time of day (computed by contextModifierService)
   * 
   * @throws {Error} "Weather API error: [error details]"
   */
  async getWeatherContextWithModifiers(lat: number, lon: number): Promise<any> {
    try {
      // Fetch weather from API using weather client utility
      const weatherData = await this.fetchWeather(lat, lon);
      
      const { main, weather, clouds } = weatherData;
      const condition = weather[0].main;
      const temp = main.temp;
      const humidity = main.humidity;
      const cloudiness = (clouds?.all ?? 50) / 100;  // Convert 0-100 to 0-1

      // Pass raw weather to contextModifierService - it computes everything internally
      const result = await contextModifierService.computeContextModifier({
        temperature: temp,
        condition,
        cloudiness,
        humidity,
        visibility: 10  // Default visibility
      });

      // Extract computed season/timeOfDay and merge with raw weather
      const { season, timeOfDay, ...modifiers } = result;

      return {
        condition,
        temp,
        humidity,
        contextModifier: modifiers,
        season,
        timeOfDay
      };
    } catch (error: any) {
      throw new Error(`Weather API error: ${error.message}`);
    }
  }
}

/**
 * Weather Service instance
 * Singleton instance for use throughout app
 * 
 * @type {WeatherService}
 */
export const weatherService = new WeatherService();
