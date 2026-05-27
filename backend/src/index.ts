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

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import albumRoutes from "./routes/albums.routes";
import userRoutes from "./routes/users.routes";
import recommendationRoutes from "./routes/recommendation.routes";
import { authRoutes } from "./routes/auth.routes";
import { configRouter } from "./routes/config.routes";

/**
 * Load environment variables from .env file
 * Required variables: PORT, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc.
 */
dotenv.config();

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

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
app.use(cors());
app.use(express.json());

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
 * - configRouter: Application configuration endpoints
 */
app.use("/api/users", userRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", recommendationRoutes);
app.use("/api/config", configRouter);

/**
 * Health check endpoint
 * GET /api/health
 * 
 * @route GET /api/health
 * @returns {Object} { message: "Server is running ✅" }
 */
app.get("/api/health", (req: Request, res: Response) => {
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
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
app.use((req: Request, res: Response) => {
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
