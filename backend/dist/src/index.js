"use strict";
/**
 * Main Express application entry point
 *
 * Initializes Express server with middleware, routes, and error handling.
 * Starts HTTP server on configured port (default: 3000).
 *
 * Routes:
 * - /api/users - User profile and taste analysis endpoints
 * - /api/albums - Album favorites and survey endpoints
 * - /api/auth - Spotify OAuth and token management
 * - /api/recommendations - Weather-based music recommendations
 *
 * Middleware chain:
 * 1. CORS - Enable cross-origin requests from frontend
 * 2. Express JSON - Parse JSON request bodies
 * 3. Routes - Handle request routing
 * 4. Error handling - Catch and format errors
 * 5. 404 handler - Handle undefined routes
 *
 * @module index
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const albums_routes_1 = __importDefault(require("./routes/albums.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const recommendation_routes_1 = __importDefault(require("./routes/recommendation.routes"));
const auth_routes_1 = require("./routes/auth.routes");
/**
 * Load environment variables from .env file
 * Required variables: PORT, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc.
 */
dotenv_1.default.config();
/**
 * Express application instance
 * @type {express.Application}
 */
const app = (0, express_1.default)();
/**
 * Server port from environment variables or default to 3000
 * @type {number|string}
 */
const PORT = process.env.PORT || 3000;
/**
 * ===== MIDDLEWARE SETUP =====
 *
 * Applied to all requests in this order:
 * 1. CORS - Allow frontend (localhost:5173) to make cross-origin requests
 * 2. JSON body parser - Parse application/json request bodies
 */
app.use((0, cors_1.default)());
app.use(express_1.default.json());
/**
 * ===== ROUTE MOUNTING =====
 *
 * Registers route modules with their base paths.
 * All routes are prefixed with /api for consistency.
 *
 * Route modules:
 * - userRoutes: Profile, taste analysis
 * - albumRoutes: Favorites, surveys
 * - authRoutes: Spotify OAuth, token management
 * - recommendationRoutes: Weather-based recommendations
 */
app.use("/api/users", users_routes_1.default);
app.use("/api/albums", albums_routes_1.default);
app.use("/api/auth", auth_routes_1.authRoutes);
app.use("/api", recommendation_routes_1.default);
/**
 * Health check endpoint
 * GET /api/health
 *
 * @route GET /api/health
 * @returns {Object} { message: "Server is running ✅" }
 */
app.get("/api/health", (req, res) => {
    res.json({ message: "Server is running ✅" });
});
/**
 * ===== ERROR HANDLING MIDDLEWARE =====
 *
 * Catches errors from route handlers and returns formatted error responses
 *
 * @middleware
 * @param {Error} err - Error object thrown from route handler
 * @returns {Object} { error: error.message | "Internal server error" }
 */
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
});
/**
 * ===== 404 NOT FOUND HANDLER =====
 *
 * Catches requests to undefined routes
 * Applied after all other routes and middleware
 *
 * @middleware
 * @returns {Object} { error: "Route not found" }
 */
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});
/**
 * ===== START SERVER =====
 *
 * Listens on configured PORT for incoming HTTP requests
 * Logs startup message with health check URL for manual testing
 */
app.listen(PORT, () => {
    console.log(`\n✅ Server running on http://localhost:${PORT}`);
    console.log(`Test it: curl http://localhost:${PORT}/api/health\n`);
});
