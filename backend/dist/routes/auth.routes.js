"use strict";
/**
 * Authentication Routes
 *
 * Maps URL endpoints for Spotify OAuth login, token refresh, and user identity verification.
 * Routes implement OAuth 2.0 Authorization Code flow with Spotify API.
 *
 * ARCHITECTURE:
 * - Routes: Define HTTP endpoints and middleware chain
 * - Controllers: Handle HTTP request/response
 * - Services: Handle OAuth token exchange and JWT generation
 *
 * @category Routes
 * @module routes/auth
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const authMiddleware_1 = require("../middleware/authMiddleware");
/**
 * Express router instance for auth routes
 * @type {Router}
 */
const router = (0, express_1.Router)();
/**
 * GET /api/auth/login
 * Initiate Spotify OAuth 2.0 authorization code flow
 *
 * @route GET /api/auth/login
 * @access Public - No authentication required
 *
 * Flow:
 * 1. Generates Spotify authorization URL with required scopes
 * 2. Redirects user's browser to Spotify login/consent page
 * 3. User logs in with Spotify credentials
 * 4. User grants app permission to access their data
 * 5. Spotify redirects back to /callback endpoint with authorization code
 *
 * Scopes requested:
 * - user-read-private: Access user profile info
 * - user-read-email: Access user's email
 * - user-library-read: Access saved albums/songs
 * - user-top-read: Access top artists/tracks
 *
 * @returns {void} Redirect to Spotify authorization endpoint
 */
router.get("/login", (req, res) => auth_controller_1.authController.login(req, res));
/**
 * GET /api/auth/callback
 * Handle Spotify OAuth authorization code callback
 *
 * @route GET /api/auth/callback
 * @access Public - Called by Spotify (no user auth needed yet)
 * @param {string} code - Authorization code from Spotify (query parameter)
 * @param {string} state - Security state parameter (query parameter)
 *
 * Flow:
 * 1. Spotify redirects here after user grants permission
 * 2. Backend exchanges authorization code for Spotify access/refresh tokens
 * 3. Backend fetches user's Spotify profile data
 * 4. Backend creates or updates user in database
 * 5. Backend generates JWT tokens (short-lived access + long-lived refresh)
 * 6. Redirects user to frontend with JWT tokens in URL
 * 7. Frontend stores tokens in localStorage for future API calls
 *
 * @returns {void} Redirect to frontend callback page with JWT tokens
 *
 * @example
 * // Spotify redirects here after user auth:
 * GET /api/auth/callback?code=AQDzx...&state=xyz...
 *
 * // Backend redirects to:
 * http://localhost:5173/callback?accessToken=...&refreshToken=...&spotifyToken=...
 */
router.get("/callback", (req, res) => auth_controller_1.authController.callback(req, res));
/**
 * POST /api/auth/refresh
 * Generate new access token using refresh token
 *
 * @route POST /api/auth/refresh
 * @access Public - Called when access token expires
 *
 * Body:
 * - refreshToken: string - Long-lived token from login
 *
 * Purpose:
 * - Access tokens expire in 15 minutes
 * - Frontend calls this endpoint when access token expires
 * - Server generates new access token without requiring re-login
 *
 * @returns {Object} { accessToken: string }
 *
 * @example
 * POST /api/auth/refresh
 * Content-Type: application/json
 *
 * { "refreshToken": "eyJhbGc..." }
 *
 * Response:
 * { "accessToken": "eyJhbGc..." }
 */
router.post("/refresh", (req, res) => auth_controller_1.authController.refresh(req, res));
/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 *
 * @route GET /api/auth/me
 * @access Private - Requires valid JWT access token
 * @middleware authMiddleware - Validates JWT and extracts userId
 *
 * Purpose:
 * - Verify the JWT token is still valid
 * - Retrieve current user's profile info
 * - Used by frontend to get user data on app load
 *
 * @returns {Object} User profile from database
 * @returns {string} returns.id - User's unique ID
 * @returns {string} returns.email - User's email
 * @returns {string} returns.name - User's display name
 * @returns {string} returns.spotifyId - Spotify's user ID
 *
 * @example
 * GET /api/auth/me
 * Authorization: Bearer <jwt_access_token>
 *
 * Response:
 * {
 *   id: "clp1h2j3k4l5m6",
 *   email: "user@example.com",
 *   name: "John Doe",
 *   spotifyId: "spotify_user_id_123"
 * }
 */
router.get("/me", authMiddleware_1.authMiddleware, (req, res) => auth_controller_1.authController.getMe(req, res));
/**
 * Auth routes export
 *
 * @exports router - Express router with authentication endpoints
 */
exports.authRoutes = router;
//# sourceMappingURL=auth.routes.js.map