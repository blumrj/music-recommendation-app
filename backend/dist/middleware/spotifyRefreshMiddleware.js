"use strict";
/**
 * Spotify Token Refresh Middleware
 *
 * Refreshes Spotify access token if needed and attaches it to request.
 * Applied AFTER authMiddleware on routes that need Spotify API access.
 *
 * Delegates to userService for database operations (separation of concerns).
 *
 * Separates concerns:
 * - authMiddleware: JWT validation only
 * - spotifyRefreshMiddleware: HTTP layer, calls service for token refresh
 * - userService.getAndRefreshSpotifyToken(): Business logic, handles Prisma
 *
 * @category Middleware
 * @module middleware/spotifyRefreshMiddleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotifyRefreshMiddleware = void 0;
const users_service_1 = require("../modules/users/users.service");
const logger_1 = require("../shared/logger");
/**
 * Spotify Token Refresh Middleware
 *
 * Refreshes Spotify access token using refresh token if available.
 * Attaches fresh token to request for use in route handlers.
 *
 * Must be applied AFTER authMiddleware (which extracts userId).
 *
 * @middleware
 * @param {Request} req - Express request object (userId must be attached by authMiddleware)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 *
 * Flow:
 * 1. Get userId from request (set by authMiddleware)
 * 2. Delegate to userService.getAndRefreshSpotifyToken(userId)
 * 3. Service handles: DB lookup, token refresh, persistence
 * 4. Attach fresh token to request for route handler
 * 5. If error, return 401 Unauthorized
 *
 * @returns {void} Calls next() if token available, sends 401 if missing
 *
 * @throws {401} No Spotify token available
 *
 * @example
 * // Apply to a route that needs Spotify:
 * router.get(
 *   '/api/recommendations',
 *   authMiddleware,           // 1. Validate JWT
 *   spotifyRefreshMiddleware, // 2. Refresh Spotify token
 *   controller.handler        // 3. Use fresh token
 * );
 *
 * // Use in route handler:
 * const spotifyToken = (req as any).spotifyToken;
 */
const spotifyRefreshMiddleware = async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        // Delegate to service for Spotify token refresh
        try {
            const spotifyToken = await users_service_1.userService.getAndRefreshSpotifyToken(userId);
            req.spotifyToken = spotifyToken;
            logger_1.logger.info("SPOTIFY", "✓ Spotify token attached to request");
            next();
        }
        catch (error) {
            logger_1.logger.error("SPOTIFY", `Failed to get Spotify token: ${error.message}`);
            return res.status(401).json({ error: error.message });
        }
    }
    catch (error) {
        logger_1.logger.error("SPOTIFY", `Middleware error: ${error.message}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.spotifyRefreshMiddleware = spotifyRefreshMiddleware;
//# sourceMappingURL=spotifyRefreshMiddleware.js.map