/**
 * User Service
 * 
 * Handles database operations for user profiles and taste analysis.
 * 
 * Key responsibilities:
 * - Create and update users with Spotify credentials
 * - Retrieve user profiles and taste preferences
 * - Manage user-album relationships
 * 
 * Data persistence:
 * - Users: Spotify ID, email, name, tokens
 * - Taste profiles: Emotional dimensions, insights, preferences
 * - Albums: Saved albums, favorites, surveyed albums
 * 
 * @category Services
 * @module services/users
 */

import { PrismaClient } from "@prisma/client";
import { authService } from "../auth/auth.service";
import { logger } from "../../shared/logger";

/**
 * Prisma client instance for database operations
 * @type {PrismaClient}
 */
const prisma = new PrismaClient();

/**
 * User Service
 * 
 * Handles all database operations related to users.
 * All methods are async and throw errors on database failures.
 * 
 * @class UserService
 */
export class UserService {

  /**
   * Get user by ID with related albums
   * 
   * Retrieves user from database with all related albums.
   * 
   * @async
   * @param {string} userId - Internal database user ID
   * 
   * @returns {Promise<Object|null>} User object with related data or null if not found
   * @returns {string} returns.id - User's unique ID
   * @returns {string} returns.spotifyId - Spotify user ID
   * @returns {string} returns.email - User's email
   * @returns {string} returns.name - User's display name
   * @returns {string} returns.spotifyToken - Spotify access token
   * @returns {string} returns.spotifyRefreshToken - Spotify refresh token
   * @returns {string} returns.refreshToken - Internal refresh token
   * @returns {Array<Object>} returns.albums - Related albums array
   * 
   * @example
   * const user = await userService.getUserById(userId);
   * if (user) {
   *   console.log(user.name, user.albums.length);
   * }
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    return user;
  }

  /**
   * Get user by Spotify ID
   * 
   * Looks up user in database by their Spotify ID.
   * Used during OAuth callback to check if user already exists.
   * 
   * @async
   * @param {string} spotifyId - Spotify's unique user ID
   * 
   * @returns {Promise<Object|null>} User object if found, null otherwise
   * 
   * @example
   * const existingUser = await userService.getUserBySpotifyId(spotifyId);
   * if (!existingUser) {
   *   // Create new user
   * }
   */
  async getUserBySpotifyId(spotifyId: string) {
    return await prisma.user.findUnique({
      where: { spotifyId },
    });
  }

  /**
   * Create new user or update existing user with Spotify data
   * 
   * Persists user profile and tokens in database for future API calls.
   * Called during OAuth callback after successfully getting Spotify tokens.
   * Uses upsert pattern: creates if doesn't exist, updates if already exists.
   * 
   * @async
   * @param {string} spotifyId - Spotify's unique user ID
   * @param {string} email - User's email from Spotify
   * @param {string} name - User's display name from Spotify
   * @param {string} refreshToken - Our internal JWT refresh token (for invalidation)
   * @param {string} [spotifyAccessToken] - Spotify access token for API calls (optional)
   * @param {string} [spotifyRefreshToken] - For refreshing Spotify token (optional)
   * 
   * @returns {Promise<Object>} User object from database with all fields
   * 
   * @example
   * const user = await userService.createOrUpdateUser(
   *   spotifyId,
   *   email,
   *   displayName,
   *   jwtRefreshToken,
   *   spotifyAccessToken,
   *   spotifyRefreshToken
   * );
   */
  async createOrUpdateUser(
    spotifyId: string,
    email: string,
    name: string,
    refreshToken: string,
    spotifyAccessToken?: string,
    spotifyRefreshToken?: string,
  ) {
    // STAGE 1: Create or update user using upsert
    // If user with this spotifyId exists, update them
    // Otherwise, create new user
    const data = await prisma.user.upsert({
      where: { spotifyId },
      update: { 
        email, 
        name, 
        refreshToken,
        spotifyToken: spotifyAccessToken,
        spotifyRefreshToken: spotifyRefreshToken
      },
      create: { 
        spotifyId, 
        email, 
        name, 
        refreshToken,
        spotifyToken: spotifyAccessToken,
        spotifyRefreshToken: spotifyRefreshToken
      },
    });
    
    // STAGE 2: Return the user object
    return data;
  }

  /**
   * Get user's taste profile
   * 
   * Retrieves user's emotional profile analysis if one has been generated.
   * Returns null if user hasn't completed enough surveys to generate profile.
   * 
   * @async
   * @param {string} userId - User's unique identifier
   * 
   * @returns {Promise<Object|null>} UserTasteProfile object or null
   * @returns {number} returns.nature - Nature dimension score (0-1)
   * @returns {number} returns.introspection - Introspection score (0-1)
   * @returns {number} returns.movement - Movement score (0-1)
   * @returns {number} returns.healing - Healing score (0-1)
   * @returns {number} returns.melancholy - Melancholy score (0-1)
   * @returns {number} returns.freedom - Freedom score (0-1)
   * @returns {number} returns.energyLevel - Energy level score (0-1)
   * @returns {number} returns.coziness - Coziness score (0-1)
   * @returns {number} returns.dreaminess - Dreaminess score (0-1)
   * @returns {Array<string>} returns.dominantThemes - Top themes
   * @returns {string} returns.userType - Categorized user type
   * @returns {string} returns.insights - AI-generated insights text
   * 
   * @example
   * const profile = await userService.getTasteProfile(userId);
   * if (!profile) {
   *   console.log("Need to complete 5+ surveys first");
   * }
   */
  async getTasteProfile(userId: string) {
    const profile = await prisma.userTasteProfile.findUnique({
      where: { userId },
      include: {
        dimensions: {
          include: { dimension: true }
        }
      }
    });
    return profile;
  }

  /**
   * Get user's Spotify credentials (access token and refresh token)
   * 
   * Retrieves stored Spotify tokens needed for API calls and token refresh.
   * 
   * @async
   * @param {string} userId - User ID from JWT token
   * 
   * @returns {Promise<Object>} User's Spotify tokens
   * @returns {string} returns.spotifyToken - Current Spotify access token
   * @returns {string} returns.spotifyRefreshToken - Spotify refresh token (for OAuth renewal)
   * 
   * @throws {Error} "User not found" if userId is invalid
   * @throws {Error} "User not authenticated with Spotify" if no access token stored
   * @throws {Error} "Failed to fetch user credentials: [error details]"
   * 
   * @example
   * const creds = await userService.getUserSpotifyCredentials(userId);
   * const newToken = await authService.refreshAccessToken(creds.spotifyRefreshToken);
   */
  async getUserSpotifyCredentials(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.spotifyToken) {
        throw new Error("User not authenticated with Spotify");
      }

      return {
        spotifyToken: user.spotifyToken,
        spotifyRefreshToken: user.spotifyRefreshToken || ""
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch user credentials: ${error.message}`);
    }
  }

  /**
   * Get and refresh Spotify token if needed
   * 
   * Retrieves user's Spotify access token, refreshing it if a refresh token exists.
   * Updates the database with the fresh token.
   * 
   * @async
   * @param {string} userId - User ID from JWT token
   * 
   * @returns {Promise<string>} Fresh Spotify access token
   * 
   * @throws {Error} "User not found" if userId is invalid
   * @throws {Error} "User not authenticated with Spotify" if no access token stored
   * 
   * Flow:
   * 1. Look up user by ID
   * 2. If no user or no Spotify token, throw error
   * 3. If refresh token exists, exchange it for new access token via Spotify API
   * 4. Update user's stored token with fresh one
   * 5. Return the token (fresh or original)
   * 
   * @example
   * const spotifyToken = await userService.getAndRefreshSpotifyToken(userId);
   * // Now use spotifyToken for Spotify API calls
   */
  async getAndRefreshSpotifyToken(userId: string): Promise<string> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { spotifyToken: true, spotifyRefreshToken: true }
      });

      if (!user || !user.spotifyToken) {
        throw new Error("User not authenticated with Spotify");
      }

      // If refresh token available, exchange it for new access token
      if (user.spotifyRefreshToken && user.spotifyRefreshToken.length > 0) {
        try {
          const newTokens = await authService.refreshAccessToken(user.spotifyRefreshToken);
          const freshToken = newTokens.access_token;

          // Update user with fresh token
          await prisma.user.update({
            where: { id: userId },
            data: { spotifyToken: freshToken }
          });

          logger.info("USERS", "✓ Spotify token refreshed and persisted");
          return freshToken;
        } catch (error: any) {
          // If refresh fails, fall back to existing token
          logger.warn("USERS", `Spotify token refresh failed: ${error.message}`);
          return user.spotifyToken;
        }
      }

      // No refresh token available, return existing token
      return user.spotifyToken;
    } catch (error: any) {
      throw new Error(`Failed to get Spotify token: ${error.message}`);
    }
  }

  /**
   * Get user's taste and perception bias layers
   * 
   * Returns the complete two-layer user profile:
   * - taste: intrinsic emotional preference (what albums they like)
   * - bias: perception offset (how they emotionally reinterpret albums)
   * 
   * Each dimension is on scale [0, 1]:
   * - taste: user's inherent preference
   * - bias: perception adjustment (can be negative, normalized to [0,1])
   * 
   * @async
   * @param {string} userId - User ID
   * 
   * @returns {Promise<Object|null>} { taste: EmotionalVector, bias: EmotionalVector } or null if no profile
   * 
   * @example
   * const layers = await userService.getUserTasteProfileWithBias13D(userId);
   * if (layers) {
   *   const { taste, bias } = layers;
   *   // taste: intrinsic preference
   *   // bias: how they reinterpret albums emotionally
   * }
   */
  async getUserTasteProfileWithBias13D(userId: string) {
    try {
      const profile = await prisma.userTasteProfile.findUnique({
        where: { userId },
        include: {
          dimensions: {
            include: { dimension: true }
          }
        }
      });

      if (!profile) {
        return null;
      }

      // Convert dimension rows back to taste vector
      const taste: any = {
        valence: 0.5,
        arousal: 0.5,
        tension: 0.5,
        warmth: 0.5,
        intimacy: 0.5,
        density: 0.5,
        groundedness: 0.5
      };

      for (const dim of profile.dimensions) {
        taste[dim.dimension.name] = dim.value;
      }

      // Bias layer removed - compute on the fly if needed
      const bias = {
        valence: 0.0,
        arousal: 0.0,
        tension: 0.0,
        warmth: 0.0,
        intimacy: 0.0,
        density: 0.0,
        groundedness: 0.0
      };

      return { taste, bias };
    } catch (error: any) {
      console.warn("[USERS] Failed to fetch user profile with bias:", error.message);
      return null;
    }
  }
}

/**
 * User Service instance
 * Singleton instance for use throughout app
 * 
 * @type {UserService}
 */
export const userService = new UserService();
