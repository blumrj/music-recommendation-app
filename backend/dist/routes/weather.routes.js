"use strict";
/**
 * Weather Routes
 *
 * Defines weather API endpoints
 *
 * @category Routes
 * @module routes/weather
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const weather_controller_1 = require("../controllers/weather.controller");
const router = (0, express_1.Router)();
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
router.get("/", weather_controller_1.weatherController.getWeather.bind(weather_controller_1.weatherController));
exports.default = router;
//# sourceMappingURL=weather.routes.js.map