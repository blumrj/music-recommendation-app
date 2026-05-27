"use strict";
/**
 * Album Controller
 *
 * Handles HTTP requests for album favorites management and surveys.
 * Delegates business logic to albumService and surveyService.
 *
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Handles database operations and business logic
 *
 * @category Controllers
 * @module controllers/albums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumController = exports.AlbumController = void 0;
const recommendations_1 = require("../modules/recommendations");
/**
 * Album Controller
 *
 * Handles HTTP requests related to album favorites and surveys.
 * All methods are async and assume authMiddleware has already validated JWT.
 *
 * @class AlbumController
 */
class AlbumController {
    /**
     * GET /api/albums/favorites/all
     * Retrieve all albums that user has marked as favorites
     *
     * @async
     * @param {Request} req - Express request object with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * @returns {Array<Object>} Array of favorite album objects
     * @returns {string} returns[].id - Favorite record ID
     * @returns {string} returns[].userId - User who favorited
     * @returns {string} returns[].albumSpotifyId - Spotify album ID
     * @returns {string} returns[].albumName - Album title
     * @returns {string} returns[].artist - Artist name
     * @returns {string} returns[].imageUrl - Album cover image URL
     * @returns {string} returns[].spotifyUrl - Direct link to Spotify
     * @returns {string} returns[].createdAt - When album was favorited
     *
     * @throws {401} Unauthorized - userId not found
     * @throws {500} Server error
     *
     * @example
     * // Request
     * GET /api/albums/favorites/all
     * Authorization: Bearer <jwt_token>
     *
     * // Response (200 OK)
     * [
     *   {
     *     id: "fav_123",
     *     userId: "user_456",
     *     albumSpotifyId: "spotify_album_789",
     *     albumName: "Album Title",
     *     artist: "Artist Name",
     *     imageUrl: "https://...",
     *     spotifyUrl: "https://open.spotify.com/album/...",
     *     createdAt: "2026-05-08T10:30:00Z"
     *   }
     * ]
     */
    async getFavorites(req, res) {
        try {
            // STAGE 1: Extract authenticated user ID from JWT middleware
            const userId = req.userId;
            // STAGE 2: Validate user is authenticated
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            // STAGE 3: Fetch all favorites for this user from database
            const favorites = await recommendations_1.albumService.getUserFavorites(userId);
            // STAGE 4: Return list of favorite albums
            res.json(favorites);
        }
        catch (error) {
            console.error("Error getting favorites:", error);
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * POST /api/albums/favorites/save
     * Add an album to user's favorites list
     *
     * @async
     * @param {Request} req - Express request object with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * @param {Object} req.body - SaveFavoriteDTO
     * @param {string} req.body.albumSpotifyId - Spotify album ID (required)
     * @param {string} req.body.albumName - Album title (required)
     * @param {string} req.body.artist - Artist name (required)
     * @param {string} req.body.imageUrl - Album cover URL (optional)
     * @param {string} req.body.spotifyUrl - Spotify link (required)
     *
     * @returns {Object} Saved favorite record
     * @returns {string} returns.id - Favorite record ID
     * @returns {string} returns.userId - User who favorited
     * @returns {string} returns.albumSpotifyId - Spotify album ID
     * @returns {string} returns.albumName - Album title
     * @returns {string} returns.artist - Artist name
     * @returns {string} returns.imageUrl - Album cover URL
     * @returns {string} returns.spotifyUrl - Spotify link
     * @returns {string} returns.createdAt - Creation timestamp
     *
     * @throws {401} Unauthorized - userId not found
     * @throws {400} Missing required fields
     * @throws {500} Server error
     *
     * @example
     * // Request
     * POST /api/albums/favorites/save
     * Authorization: Bearer <jwt_token>
     * Content-Type: application/json
     *
     * {
     *   "albumSpotifyId": "spotify_album_id",
     *   "albumName": "Album Title",
     *   "artist": "Artist Name",
     *   "imageUrl": "https://...",
     *   "spotifyUrl": "https://open.spotify.com/album/..."
     * }
     *
     * // Response (201 Created)
     * {
     *   id: "fav_123",
     *   userId: "user_456",
     *   albumSpotifyId: "spotify_album_id",
     *   albumName: "Album Title",
     *   artist: "Artist Name",
     *   imageUrl: "https://...",
     *   spotifyUrl: "https://open.spotify.com/album/...",
     *   createdAt: "2026-05-08T10:30:00Z"
     * }
     */
    async saveFavorite(req, res) {
        try {
            // STAGE 1: Extract authenticated user ID from JWT middleware
            const userId = req.userId;
            const { albumSpotifyId, albumName, artist, imageUrl, spotifyUrl } = req.body;
            // STAGE 2: Validate user is authenticated
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            // STAGE 3: Validate required request body parameters
            if (!albumSpotifyId || !albumName || !artist || !spotifyUrl) {
                res.status(400).json({
                    error: "albumSpotifyId, albumName, artist, and spotifyUrl are required",
                });
                return;
            }
            // STAGE 4: Save album to user's favorites (creates or updates if already exists)
            const favorite = await recommendations_1.albumService.saveFavorite({
                userId,
                albumSpotifyId,
                albumName,
                artist,
                imageUrl,
                spotifyUrl,
            });
            // STAGE 5: Return saved favorite with 201 Created status
            res.status(201).json(favorite);
        }
        catch (error) {
            console.error("Error saving favorite:", error);
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * DELETE /api/albums/favorites/:spotifyId
     * Remove an album from user's favorites
     *
     * @async
     * @param {Request} req - Express request object with userId from authMiddleware
     * @param {Response} res - Express response object
     *
     * @param {string} req.params.spotifyId - Spotify album ID to remove (URL parameter)
     *
     * @returns {Object} Success message
     * @returns {string} returns.message - "Favorite removed successfully"
     *
     * @throws {401} Unauthorized - userId not found
     * @throws {400} Missing spotifyId parameter
     * @throws {500} Server error
     *
     * @example
     * // Request
     * DELETE /api/albums/favorites/spotify_album_id_123
     * Authorization: Bearer <jwt_token>
     *
     * // Response (200 OK)
     * { "message": "Favorite removed successfully" }
     */
    async removeFavorite(req, res) {
        try {
            // STAGE 1: Extract authenticated user ID from JWT middleware
            const userId = req.userId;
            const { spotifyId } = req.params;
            // STAGE 2: Validate user is authenticated
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }
            // STAGE 3: Validate required URL parameter
            if (!spotifyId) {
                res.status(400).json({ error: "spotifyId is required" });
                return;
            }
            // STAGE 4: Remove album from user's favorites
            await recommendations_1.albumService.removeFavorite(userId, spotifyId);
            // STAGE 5: Return success message
            res.json({ message: "Favorite removed successfully" });
        }
        catch (error) {
            console.error("Error removing favorite:", error);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.AlbumController = AlbumController;
/**
 * Album Controller instance
 * Singleton instance for use in routes
 *
 * @type {AlbumController}
 */
exports.albumController = new AlbumController();
