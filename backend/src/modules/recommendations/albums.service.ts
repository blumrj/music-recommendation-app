/**
 * Album Service
 * 
 * Handles database and Spotify API operations for albums.
 * 
 * Key responsibilities:
 * - Fetch saved albums from Spotify
 * - Handle album surveys and analysis
 * 
 * Data persistence:
 * - Surveys: User's emotional feedback about albums
 * 
 * External APIs:
 * - Spotify: Fetch user's saved albums
 * 
 * @category Services
 * @module services/albums
 */

import { PrismaClient } from "@prisma/client";
import { SpotifyAlbumsResponseDTO, FormattedAlbumDTO } from "../../types/spotify.dto";
import { createSpotifyClient } from "../../infrastructure/spotify/spotify-client";

/**
 * Prisma client instance for database operations
 * @type {PrismaClient}
 */
const prisma = new PrismaClient();

/**
 * Album Service
 * 
 * Handles all album-related database and API operations.
 * All methods are async and throw errors on failures.
 * 
 * @class AlbumService
 */
export class AlbumService {
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
  async getSavedAlbumsFromSpotify(accessToken: string, limit: number = 15): Promise<FormattedAlbumDTO[]> {
    try {
      // STAGE 1: Create authenticated Spotify API client
      console.log("[ALBUMS] STAGE 1: Creating Spotify client for saved albums fetch");
      const spotifyClient = createSpotifyClient(accessToken);

      // STAGE 2: Fetch saved albums from Spotify (fetch up to 50, we'll slice to limit)
      console.log("[ALBUMS] STAGE 2: Fetching saved albums from /me/albums (limit=50)");
      const response = await spotifyClient.get<SpotifyAlbumsResponseDTO>("/me/albums", {
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
        } else {
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
    } catch (error: any) {
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
  async searchAlbumOnSpotify(
    albumName: string,
    artist: string,
    accessToken: string
  ): Promise<string | null> {
    try {
      const spotifyClient = createSpotifyClient(accessToken);
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
    } catch (error: any) {
      console.warn(
        `[ALBUMS] Failed to search Spotify for "${albumName}" by ${artist}:`,
        error.message
      );
      return null;
    }
  }
}

/**
 * Album Service instance
 * Singleton instance for use throughout app
 * 
 * @type {AlbumService}
 */
export const albumService = new AlbumService();
