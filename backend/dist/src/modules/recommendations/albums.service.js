"use strict";
/**
 * Album Service
 *
 * Handles database and Spotify API operations for albums.
 *
 * Key responsibilities:
 * - Manage user favorites (save, remove, retrieve)
 * - Fetch saved albums from Spotify
 * - Handle album surveys and analysis
 *
 * Data persistence:
 * - Favorites: User's marked favorite albums
 * - Surveys: User's emotional feedback about albums
 *
 * External APIs:
 * - Spotify: Fetch user's saved albums
 *
 * @category Services
 * @module services/albums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumService = exports.AlbumService = void 0;
const client_1 = require("@prisma/client");
const spotify_client_1 = require("../../infrastructure/spotify/spotify-client");
/**
 * Prisma client instance for database operations
 * @type {PrismaClient}
 */
const prisma = new client_1.PrismaClient();
/**
 * Album Service
 *
 * Handles all album-related database and API operations.
 * All methods are async and throw errors on failures.
 *
 * @class AlbumService
 */
class AlbumService {
    /**
     * Get all favorite albums for a specific user
     *
     * Retrieves the complete list of albums the user has marked as favorites.
     * Results are ordered by most recent first.
     *
     * @async
     * @param {string} userId - The user's unique identifier
     *
     * @returns {Promise<Array<Object>>} Array of Favorite records
     * @returns {string} returns[].id - Favorite record ID
     * @returns {string} returns[].userId - User who favorited
     * @returns {string} returns[].albumSpotifyId - Spotify album ID
     * @returns {string} returns[].albumName - Album title
     * @returns {string} returns[].artist - Artist name
     * @returns {string} returns[].imageUrl - Album cover URL
     * @returns {string} returns[].spotifyUrl - Spotify link
     * @returns {string} returns[].createdAt - When favorited
     *
     * @example
     * const favorites = await albumService.getUserFavorites(userId);
     * console.log(favorites.length); // Number of favorite albums
     */
    async getUserFavorites(userId) {
        const favorites = await prisma.favorite.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return favorites;
    }
    /**
     * Save an album to user's favorites (create or update if already exists)
     *
     * Adds album to favorites collection using upsert pattern.
     * If already favorited, does nothing (empty update).
     * If not favorited, creates new favorite record.
     *
     * @async
     * @param {Object} data - SaveFavoriteDTO
     * @param {string} data.userId - The user's unique identifier
     * @param {string} data.albumSpotifyId - Spotify album ID (unique key)
     * @param {string} data.albumName - Album title
     * @param {string} data.artist - Primary artist name
     * @param {string} data.imageUrl - Album cover image URL
     * @param {string} data.spotifyUrl - Direct link to Spotify
     *
     * @returns {Promise<Object>} Favorite record
     * @returns {string} returns.id - Favorite record ID
     * @returns {string} returns.userId - User who favorited
     * @returns {string} returns.albumSpotifyId - Spotify album ID
     * @returns {string} returns.createdAt - When created
     *
     * @example
     * const favorite = await albumService.saveFavorite({
     *   userId,
     *   albumSpotifyId: "spotify_id",
     *   albumName: "Title",
     *   artist: "Artist",
     *   imageUrl: "url",
     *   spotifyUrl: "spotify_url"
     * });
     */
    async saveFavorite(data) {
        const favorite = await prisma.favorite.upsert({
            where: {
                userId_albumSpotifyId: {
                    userId: data.userId,
                    albumSpotifyId: data.albumSpotifyId,
                },
            },
            // If favorite already exists, do nothing (empty update)
            update: {},
            // If favorite doesn't exist, create it with full data
            create: {
                userId: data.userId,
                albumSpotifyId: data.albumSpotifyId,
                albumName: data.albumName,
                artist: data.artist,
                imageUrl: data.imageUrl,
                spotifyUrl: data.spotifyUrl,
            },
        });
        return favorite;
    }
    /**
     * Remove an album from user's favorites
     *
     * Deletes all favorite records matching user + album combination.
     * Safe to call even if album isn't favorited.
     *
     * @async
     * @param {string} userId - The user's unique identifier
     * @param {string} albumSpotifyId - Spotify album ID to remove
     *
     * @returns {Promise<void>} No return value, just deletes the record
     *
     * @example
     * await albumService.removeFavorite(userId, albumSpotifyId);
     * // Album is now removed from favorites
     */
    async removeFavorite(userId, albumSpotifyId) {
        await prisma.favorite.deleteMany({
            where: {
                userId,
                albumSpotifyId,
            },
        });
    }
    /**
     * Fetch user's saved albums from Spotify API
     *
     * Gets raw album data from Spotify, transforms to consistent FormattedAlbumDTO format.
     * Used by the survey feature to find albums the user has saved on Spotify.
     *
     * @async
     * @param {string} accessToken - Spotify OAuth2 bearer token (user's access token)
     * @param {number} [limit=15] - Maximum number of albums to return (default 15)
     *
     * @returns {Promise<Array<FormattedAlbumDTO>>} Array of formatted album objects
     * @returns {string} returns[].spotifyId - Spotify album ID
     * @returns {string} returns[].name - Album name
     * @returns {string} returns[].artist - First artist name (or "Unknown")
     * @returns {string} returns[].imageUrl - Album cover URL (or empty string)
     * @returns {string} returns[].spotifyUrl - Direct link to Spotify
     *
     * @throws {Error} If Spotify API call fails or token is invalid
     *
     * @example
     * const albums = await albumService.getSavedAlbumsFromSpotify(accessToken, 20);
     * console.log(albums.length); // Up to 20 albums
     * albums.forEach(a => console.log(a.name)); // Album names
     */
    async getSavedAlbumsFromSpotify(accessToken, limit = 15) {
        try {
            // STAGE 1: Create authenticated Spotify API client
            console.log("[ALBUMS] STAGE 1: Creating Spotify client for saved albums fetch");
            const spotifyClient = (0, spotify_client_1.createSpotifyClient)(accessToken);
            // STAGE 2: Fetch saved albums from Spotify (fetch up to 50, we'll slice to limit)
            console.log("[ALBUMS] STAGE 2: Fetching saved albums from /me/albums (limit=50)");
            const response = await spotifyClient.get("/me/albums", {
                params: { limit: 50 },
            });
            // STAGE 3: Extract albums data from response
            console.log("[ALBUMS] STAGE 3: Parsing response data");
            const data = response.data;
            console.log("[ALBUMS]   Response structure:", {
                hasData: !!data,
                dataKeys: data ? Object.keys(data) : [],
                total: data?.total,
                itemsCount: data?.items?.length || 0,
                offset: data?.offset,
                limit: data?.limit
            });
            const items = data.items || [];
            console.log(`[ALBUMS]   Found ${items.length} items in response`);
            if (items.length === 0) {
                console.warn("[ALBUMS] ⚠️  WARNING: No items returned from Spotify /me/albums endpoint");
                console.warn("[ALBUMS]   This could indicate:");
                console.warn("[ALBUMS]   - Token lacks 'user-library-read' scope");
                console.warn("[ALBUMS]   - User has no saved albums");
                console.warn("[ALBUMS]   - API response structure changed");
                return [];
            }
            // Inspect first item structure
            if (items.length > 0) {
                const firstItem = items.find((item) => item && item.album); // Find first valid item
                if (firstItem?.album) {
                    console.log("[ALBUMS] First item structure:", {
                        hasAlbum: true,
                        albumId: firstItem.album.id,
                        albumName: firstItem.album.name,
                        artistCount: firstItem.album.artists?.length || 0,
                        imagesCount: firstItem.album.images?.length || 0
                    });
                }
                else {
                    console.warn("[ALBUMS] ⚠️ No valid items with album data found in first batch");
                }
            }
            // STAGE 4: Transform Spotify format to our FormattedAlbumDTO
            console.log(`[ALBUMS] STAGE 4: Transforming ${items.length} items to FormattedAlbumDTO`);
            const albums = items
                .filter((item) => item && item.album) // Filter out null/missing album items
                .slice(0, limit) // Limit to requested number
                .map((item) => {
                const album = item.album;
                // Log any items with missing critical fields
                if (!album.artists || album.artists.length === 0) {
                    console.warn(`[ALBUMS]   ⚠️ Album "${album.name}" (${album.id}) has no artists`);
                }
                return {
                    spotifyId: album.id, // Spotify album ID
                    name: album.name, // Album name
                    artist: album.artists?.[0]?.name || "Unknown", // First artist (fallback to Unknown)
                    imageUrl: album.images?.[0]?.url || "", // Album cover (first image, fallback to empty)
                    spotifyUrl: album.external_urls?.spotify || "", // Direct link to Spotify
                };
            });
            // STAGE 5: Return formatted albums
            console.log(`[ALBUMS] ✓ STAGE 5: Returning ${albums.length} formatted albums`);
            return albums;
        }
        catch (error) {
            console.error("[ALBUMS] ❌ Error fetching saved albums from Spotify:", {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                responseData: error.response?.data,
                code: error.code
            });
            throw error;
        }
    }
    /**
     * Search for an album on Spotify by name and artist
     *
     * Looks up an album on Spotify using album name + artist.
     * Used for Last.fm candidates that need Spotify album links.
     *
     * @async
     * @param {string} albumName - Album name to search for
     * @param {string} artist - Artist name to search for
     * @param {string} accessToken - Spotify OAuth2 bearer token
     *
     * @returns {Promise<string|null>} Direct Spotify album URL or null if not found
     *
     * @example
     * const spotifyUrl = await albumService.searchAlbumOnSpotify(
     *   "Abbey Road",
     *   "The Beatles",
     *   accessToken
     * );
     * // Returns: "https://open.spotify.com/album/0DiWHAXhnHc7V33zj2zWVJ"
     */
    async searchAlbumOnSpotify(albumName, artist, accessToken) {
        try {
            const spotifyClient = (0, spotify_client_1.createSpotifyClient)(accessToken);
            const query = `album:"${albumName}" artist:"${artist}"`;
            const response = await spotifyClient.get('/v1/search', {
                params: {
                    q: query,
                    type: 'album',
                    limit: 1
                }
            });
            const albums = response.data.albums?.items;
            if (albums && albums.length > 0) {
                const albumId = albums[0].id;
                return `https://open.spotify.com/album/${albumId}`;
            }
            return null;
        }
        catch (error) {
            console.warn(`[ALBUMS] Failed to search Spotify for "${albumName}" by ${artist}:`, error.message);
            return null;
        }
    }
}
exports.AlbumService = AlbumService;
/**
 * Album Service instance
 * Singleton instance for use throughout app
 *
 * @type {AlbumService}
 */
exports.albumService = new AlbumService();
