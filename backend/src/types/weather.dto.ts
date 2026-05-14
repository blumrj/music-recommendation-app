/**
 * Weather API DTOs and Types
 * Types for OpenWeatherMap API data and weather mood categorization
 */

/**
 * Weather mood categories
 * Mapped from OpenWeatherMap conditions to our internal mood system
 * Used for weather-appropriate album recommendations
 */
export type WeatherMood = "sunny" | "rainy" | "snowy" | "stormy" | "cloudy";

/**
 * OpenWeatherMap API response structure
 * Represents the JSON response from OpenWeatherMap current weather endpoint
 */
export interface OpenWeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: {
    main: string;
  }[];
}
