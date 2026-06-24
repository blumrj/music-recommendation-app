/**
 * Weather Routes
 * 
 * Defines weather API endpoints
 * 
 * @category Routes
 * @module routes/weather
 */

import { Router } from "express";
import { weatherController } from "../controllers/weather.controller";

const router = Router();

/**
 * GET /api/weather
 * 
 * Get current weather for a location
 * 
 * Query Parameters:
 * - lat (required): Latitude coordinate
 * - lon (required): Longitude coordinate
 * 
 * Response: { condition, temp, humidity, season, timeOfDay }
 */
router.get("/", weatherController.getWeather.bind(weatherController));

export default router;
