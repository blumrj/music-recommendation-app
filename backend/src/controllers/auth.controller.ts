/**
 * Authentication Controller
 * 
 * Handles HTTP requests for Spotify OAuth login, token refresh, and user identity.
 * Implements OAuth 2.0 Authorization Code flow with Spotify API.
 * 
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Handles OAuth token exchange and JWT generation
 * 
 * Key concepts:
 * - Spotify tokens: Access/refresh tokens from Spotify API
 * - JWT tokens: Our app's tokens for internal use (access + refresh)
 * - Token separation: Spotify tokens for API calls, JWT tokens for auth
 * 
 * @category Controllers
 * @module controllers/auth
 */

import { Request, Response } from "express";
import { authService } from "../modules/auth/auth.service";
import { userService } from "../modules/users/users.service";
import { logger } from "../shared/logger";

/**
 * Authentication Controller
 * 
 * Handles Spotify OAuth login flow, token refresh, and user profile endpoints.
 * All methods are async and follow the stages pattern for clarity.
 * 
 * @class AuthController
 */
export class AuthController {
  /**
   * GET /api/auth/login
   * Initiate Spotify OAuth login flow
   * 
   * Purpose: Redirect user to Spotify authorization page
   * User grants our app permission to access their Spotify data
   * 
   * Flow:
   * 1. Generate Spotify auth URL with required scopes
   * 2. Redirect browser to Spotify's authorization endpoint
   * 3. User logs in and grants permissions
   * 4. Spotify redirects back to /callback endpoint
   */
  async login(req: Request, res: Response) {
    try {
      // STAGE 1: Generate Spotify login URL with OAuth parameters
      const authUrl = authService.generateAuthUrl();

      // STAGE 2: Redirect user's browser to Spotify
      res.redirect(authUrl);
    } catch (error: any) {
      logger.error("AUTH", `Error generating auth URL: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/auth/callback
   * Handle Spotify OAuth callback and complete login flow
   * 
   * Purpose: Process authorization code from Spotify, exchange for tokens,
   * create/update user in database, and generate JWT tokens for our app
   * 
   * Query Parameters:
   * - code: string - Authorization code from Spotify (temporary, one-time use)
   * - state: string - OAuth state parameter for security
   * 
   * Redirect: Sends user to frontend with JWT tokens in URL params
   */
  async callback(req: Request, res: Response) {
    try {
      // STAGE 1: Extract authorization code from Spotify callback URL
      const { code } = req.query;

      // STAGE 2: Validate authorization code exists
      if (!code) {
        res.status(400).json({ error: "Authorization code missing" });
        return;
      }

      // STAGE 3: Exchange authorization code for Spotify access/refresh tokens
      // Code is temporary and one-time use - only backend can exchange it
      const spotifyTokens = await authService.exchangeCodeForToken(code as string);

      // STAGE 4: Use Spotify access token to fetch user's Spotify profile
      const spotifyProfile = await authService.getUserProfile(spotifyTokens.access_token);

      // STAGE 5: Create or update user in our database with Spotify data
      const user = await userService.createOrUpdateUser(
        spotifyProfile.id,
        spotifyProfile.email,
        spotifyProfile.display_name,
        spotifyTokens.refresh_token || "",
        spotifyTokens.access_token,
        spotifyTokens.refresh_token,
      );

      // STAGE 6: Generate our own JWT tokens (NOT Spotify's tokens)
      // accessToken: Short-lived (15m) for API requests
      // refreshToken: Long-lived (7d) for getting new access tokens
      const accessToken = authService.generateAccessToken(user.id);
      const refreshToken = authService.generateRefreshToken(user.id);

      // STAGE 7: Redirect to frontend with all tokens in URL params
      // Frontend extracts, stores in localStorage, and uses for API calls
      const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
      const frontendCallback = `${frontendBase}/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&spotifyToken=${encodeURIComponent(spotifyTokens.access_token)}`;
      res.redirect(frontendCallback);

    } catch (error: any) {
      logger.error("AUTH", `Error in auth callback: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/auth/refresh
   * Generate new access token using refresh token
   * 
   * Purpose: Called by frontend when access token expires (15m)
   * Allows user to stay logged in without re-authenticating with Spotify
   * 
   * Body: { refreshToken: string }
   * Returns: { accessToken: string }
   */
  async refresh(req: Request, res: Response) {
    try {
      // STAGE 1: Extract refresh token from request body
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(401).json({ error: "Refresh token required" });
        return;
      }

      // STAGE 2: Verify refresh token is valid and not expired
      const decoded = authService.verifyRefreshToken(refreshToken);

      // STAGE 3: Generate NEW access token with same userId
      const newAccessToken = authService.generateAccessToken(decoded.userId);

      // STAGE 4: Return new access token to frontend
      res.json({ accessToken: newAccessToken });
    } catch (error: any) {
      res.status(401).json({ error: "Invalid refresh token" });
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user profile
   * 
   * @async
   * @param {Request} req - Express request object with userId from authMiddleware
   * @param {Response} res - Express response object
   * 
   * Purpose:
   * - Return minimal user data from JWT verification
   * - Used by frontend AuthContext on app startup to confirm user is logged in
   * - Validates JWT token is still valid
   * 
   * @returns {Object} Minimal user profile
   * @returns {string} returns.id - User's unique ID
   * @returns {string} returns.email - User's email address
   * @returns {string} returns.name - User's display name
   * @returns {string} returns.spotifyId - Spotify's user ID
   * 
   * @throws {401} Not authenticated - userId not found
   * @throws {404} User not found in database
   * @throws {500} Server error
   * 
   * @example
   * // Request
   * GET /api/auth/me
   * Authorization: Bearer <jwt_access_token>
   * 
   * // Response (200 OK)
   * {
   *   id: "clp1h2j3k4l5m6",
   *   email: "user@example.com",
   *   name: "John Doe",
   *   spotifyId: "spotify_user_id_123"
   * }
   */
  async getMe(req: Request, res: Response) {
    try {
      // STAGE 1: Extract userId from JWT middleware (already verified by authMiddleware)
      const userId = (req as any).userId;

      // STAGE 2: Validate userId exists (middleware should ensure this)
      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      // STAGE 3: Fetch user from database
      const user = await userService.getUserById(userId);

      // STAGE 4: Validate user exists in database
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // STAGE 5: Return user data (WITHOUT refreshToken for security)
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        spotifyId: user.spotifyId,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * Auth Controller instance
 * Singleton instance for use in routes
 * 
 * @type {AuthController}
 */
export const authController = new AuthController();
