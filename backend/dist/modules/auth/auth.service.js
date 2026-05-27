"use strict";
/**
 * Authentication Service
 *
 * Handles Spotify OAuth 2.0 flow and JWT token management.
 *
 * Key responsibilities:
 * - Generate Spotify authorization URLs
 * - Exchange authorization codes for Spotify tokens
 * - Refresh expired Spotify access tokens
 * - Fetch user profiles from Spotify API
 * - Generate and verify JWT tokens for internal authentication
 *
 * Token types:
 * - Spotify tokens: Used to call Spotify API on behalf of user
 * - JWT access token: Short-lived (15m), used to authenticate API requests
 * - JWT refresh token: Long-lived (7d), used to get new access tokens
 *
 * @category Services
 * @module services/auth
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const spotify_client_1 = require("../../infrastructure/spotify/spotify-client");
dotenv_1.default.config();
/**
 * Spotify OAuth Configuration
 * Loaded from environment variables
 */
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const SPOTIFY_API_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
/**
 * Authentication Service
 *
 * Handles all authentication operations including Spotify OAuth and JWT management.
 *
 * @class AuthService
 */
class AuthService {
    /**
     * Generate Spotify OAuth authorization URL
     *
     * Creates a login URL that redirects user to Spotify for authentication.
     * User grants our app permission to access their Spotify data.
     *
     * OAuth scopes requested:
     * - user-read-private: Access to user's profile data
     * - user-read-email: Access to user's email address
     * - user-library-read: Access to user's saved albums
     * - user-top-read: Access to user's top artists and tracks
     *
     * @returns {string} Full URL to redirect user's browser to
     *
     * @example
     * const authUrl = authService.generateAuthUrl();
     * // Returns: https://accounts.spotify.com/authorize?client_id=...&scope=...
     * res.redirect(authUrl);
     */
    generateAuthUrl() {
        const scopes = [
            "user-read-private",
            "user-read-email",
            "user-library-read", // Access to liked songs
            "user-top-read", // Access to top artists/tracks
        ];
        // STAGE 1: Build OAuth authorization URL with required parameters
        const url = new URL(SPOTIFY_AUTH_URL);
        const params = new URLSearchParams();
        params.append("client_id", CLIENT_ID);
        params.append("response_type", "code");
        params.append("redirect_uri", REDIRECT_URI);
        params.append("scope", scopes.join(" "));
        url.search = params.toString();
        // STAGE 2: Return complete authorization URL
        return url.href;
    }
    /**
     * Exchange Spotify authorization code for access tokens
     *
     * Trades temporary authorization code for tokens that grant API access.
     * This is the second step of OAuth flow after user authorizes.
     *
     * Authorization code is:
     * - Temporary (one-time use only)
     * - Provided by Spotify in /callback redirect
     * - Can only be exchanged by backend (not by frontend)
     *
     * @async
     * @param {string} code - Temporary authorization code from Spotify callback
     *
     * @returns {Promise<SpotifyTokenResponse>} Spotify tokens object
     * @returns {string} returns.access_token - Short-lived API token (~1 hour)
     * @returns {string} returns.refresh_token - Long-lived token (can refresh access token)
     * @returns {number} returns.expires_in - Access token expiration time in seconds
     * @returns {string} returns.token_type - Always "Bearer"
     *
     * @throws {Error} If code is invalid, already used, or API call fails
     *
     * @example
     * try {
     *   const tokens = await authService.exchangeCodeForToken(code);
     *   console.log(tokens.access_token); // Use for Spotify API calls
     * } catch (error) {
     *   console.error("Code exchange failed:", error);
     * }
     */
    async exchangeCodeForToken(code) {
        try {
            // STAGE 1: Prepare OAuth token exchange request body
            const params = new URLSearchParams();
            params.append("grant_type", "authorization_code");
            params.append("code", code);
            params.append("redirect_uri", REDIRECT_URI);
            // STAGE 2: Make POST request to Spotify token endpoint with Basic Auth
            const response = await axios_1.default.post(SPOTIFY_API_URL, params.toString(), {
                timeout: 10000, // 10 second timeout to prevent hanging
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " +
                        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
                },
            });
            // STAGE 3: Check if token exchange was successful (axios throws on error)
            // STAGE 4: Return Spotify tokens from response data
            return response.data;
        }
        catch (error) {
            console.error("Error exchanging code for token:", error);
            throw error;
        }
    }
    /**
     * Refresh an expired Spotify access token
     *
     * Uses long-lived refresh token to get new short-lived access token.
     * Call this when Spotify API returns 401 (token expired).
     *
     * @async
     * @param {string} refreshToken - Long-lived Spotify refresh token
     *
     * @returns {Promise<SpotifyTokenResponse>} New Spotify tokens object
     * @returns {string} returns.access_token - New short-lived API token
     *
     * @throws {Error} If refresh token is invalid or API call fails
     *
     * @example
     * try {
     *   const newTokens = await authService.refreshAccessToken(spotifyRefreshToken);
     *   // Use newTokens.access_token for future API calls
     * } catch (error) {
     *   console.error("Token refresh failed:", error);
     * }
     */
    async refreshAccessToken(refreshToken) {
        try {
            // STAGE 1: Prepare Spotify token refresh request body
            const params = new URLSearchParams();
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", refreshToken);
            params.append("client_id", CLIENT_ID);
            // STAGE 2: POST to Spotify token endpoint with Basic Auth
            const response = await axios_1.default.post(SPOTIFY_API_URL, params.toString(), {
                timeout: 10000, // 10 second timeout to prevent hanging
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " +
                        Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
                },
            });
            // STAGE 3: Check if token refresh was successful (axios throws on error)
            // STAGE 4: Return new Spotify tokens from response data
            return response.data;
        }
        catch (error) {
            console.error("Error refreshing token:", error);
            throw error;
        }
    }
    /**
     * Fetch user profile from Spotify API
     *
     * Retrieves authenticated user's Spotify profile data including name, email, images.
     * Called during OAuth callback to get user info for database storage.
     *
     * @async
     * @param {string} accessToken - Valid Spotify access token
     *
     * @returns {Promise<SpotifyUserProfile>} User profile object
     * @returns {string} returns.id - Spotify user ID
     * @returns {string} returns.email - User's email address
     * @returns {string} returns.display_name - User's display name
     * @returns {Object} returns.external_urls - Links to Spotify profile
     * @returns {Array<Object>} returns.images - Profile images
     *
     * @throws {Error} If access token is invalid or API call fails
     *
     * @example
     * const profile = await authService.getUserProfile(spotifyAccessToken);
     * console.log(profile.display_name); // "John Doe"
     * console.log(profile.email); // "john@example.com"
     */
    async getUserProfile(accessToken) {
        try {
            // STAGE 1: Create Spotify-authenticated axios client
            const client = (0, spotify_client_1.createSpotifyClient)(accessToken);
            // STAGE 2: Make GET request to Spotify /me endpoint (bearer token added automatically)
            const response = await client.get("/me");
            // STAGE 3: Return user profile from response data
            return response.data;
        }
        catch (error) {
            console.error("Error getting user profile:", error);
            throw error;
        }
    }
    /**
     * ===== JWT TOKEN OPERATIONS =====
     *
     * Manage JWT tokens for internal app authentication.
     * Separate from Spotify tokens - used to authenticate API requests.
     *
     * Token types:
     * - Access token: Short-lived (15m), for API requests
     * - Refresh token: Long-lived (7d), for getting new access tokens
     */
    /**
     * Generate short-lived access token (15 minutes)
     *
     * Creates a JWT token for authenticating API requests.
     * Token contains userId and auto-expires after 15 minutes.
     *
     * @param {string} userId - Internal database user ID to encode in token
     *
     * @returns {string} Signed JWT token string
     *
     * @example
     * const accessToken = authService.generateAccessToken(userId);
     * // Return to frontend or use for server-to-server calls
     */
    generateAccessToken(userId) {
        // STAGE 1: Sign JWT with userId payload
        // STAGE 2: Set expiration to 15 minutes
        const token = jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
        return token;
    }
    /**
     * Generate long-lived refresh token (7 days)
     *
     * Creates a JWT token for refreshing expired access tokens.
     * Allows frontend to get new access tokens without Spotify re-authentication.
     *
     * @param {string} userId - Internal database user ID to encode in token
     *
     * @returns {string} Signed JWT token string
     *
     * @example
     * const refreshToken = authService.generateRefreshToken(userId);
     * // Return to frontend or store in database
     */
    generateRefreshToken(userId) {
        // STAGE 1: Sign JWT with userId payload
        // STAGE 2: Set expiration to 7 days
        const token = jsonwebtoken_1.default.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
        return token;
    }
    /**
     * Verify and decode access token
     *
     * Validates JWT token signature and expiration.
     * Used by authMiddleware before processing protected requests.
     *
     * @param {string} token - JWT token string from Authorization header
     *
     * @returns {Object} Decoded token payload
     * @returns {string} returns.userId - User ID from token
     *
     * @throws {Error} If token is invalid or expired
     *
     * @example
     * try {
     *   const decoded = authService.verifyAccessToken(token);
     *   console.log(decoded.userId); // Access user ID
     * } catch (error) {
     *   // Token is invalid or expired - return 401
     * }
     */
    verifyAccessToken(token) {
        try {
            // STAGE 1: Verify token signature and expiration
            // STAGE 2: Return decoded payload if valid
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            return decoded;
        }
        catch (error) {
            // Token is invalid or expired
            throw new Error("Invalid or expired access token");
        }
    }
    /**
     * Verify and decode refresh token
     *
     * Validates JWT refresh token and extracts userId.
     * Used when frontend calls /refresh endpoint to get new access token.
     *
     * @param {string} token - JWT refresh token from request body
     *
     * @returns {Object} Decoded token payload
     * @returns {string} returns.userId - User ID from token
     *
     * @throws {Error} If token is invalid or expired (7 day limit)
     *
     * @example
     * try {
     *   const decoded = authService.verifyRefreshToken(refreshToken);
     *   const newAccessToken = authService.generateAccessToken(decoded.userId);
     * } catch (error) {
     *   // Token expired - user must login again
     * }
     */
    verifyRefreshToken(token) {
        try {
            // STAGE 1: Verify token signature using refresh secret
            // STAGE 2: Check expiration (7 days)
            // STAGE 3: Return decoded payload with userId
            const decoded = jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
            return decoded;
        }
        catch (error) {
            // Token is invalid or expired
            throw new Error("Invalid or expired refresh token");
        }
    }
}
exports.AuthService = AuthService;
/**
 * Auth Service instance
 * Singleton instance for use throughout app
 *
 * @type {AuthService}
 */
exports.authService = new AuthService();
