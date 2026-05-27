"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const client_1 = require("@prisma/client");
/**
 * Prisma client instance for database operations
 * @type {PrismaClient}
 */
const prisma = new client_1.PrismaClient();
/**
 * User Service
 *
 * Handles all database operations related to users.
 * All methods are async and throw errors on database failures.
 *
 * @class UserService
 */
class UserService {
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
    async getUserById(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { albums: true },
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
    async getUserBySpotifyId(spotifyId) {
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
    async createOrUpdateUser(spotifyId, email, name, refreshToken, spotifyAccessToken, spotifyRefreshToken) {
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
    async getTasteProfile(userId) {
        const profile = await prisma.userTasteProfile.findUnique({
            where: { userId },
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
    async getUserSpotifyCredentials(userId) {
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
        }
        catch (error) {
            throw new Error(`Failed to fetch user credentials: ${error.message}`);
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
    async getUserTasteProfileWithBias13D(userId) {
        try {
            const profile = await prisma.userTasteProfile.findUnique({
                where: { userId }
            });
            if (!profile) {
                return null;
            }
            // Extract both taste and bias vectors
            const taste = {
                valence: profile.valence ?? 0.5,
                arousal: profile.arousal ?? 0.5,
                tension: profile.tension ?? 0.5,
                warmth: profile.warmth ?? 0.5,
                intimacy: profile.intimacy ?? 0.5,
                density: profile.density ?? 0.5,
                groundedness: profile.groundedness ?? 0.5
            };
            const bias = {
                valence: profile.bias_valence ?? 0.0,
                arousal: profile.bias_arousal ?? 0.0,
                tension: profile.bias_tension ?? 0.0,
                warmth: profile.bias_warmth ?? 0.0,
                intimacy: profile.bias_intimacy ?? 0.0,
                density: profile.bias_density ?? 0.0,
                groundedness: profile.bias_groundedness ?? 0.0
            };
            return { taste, bias };
        }
        catch (error) {
            console.warn("[USERS] Failed to fetch user profile with bias:", error.message);
            return null;
        }
    }
}
exports.UserService = UserService;
/**
 * User Service instance
 * Singleton instance for use throughout app
 *
 * @type {UserService}
 */
exports.userService = new UserService();
