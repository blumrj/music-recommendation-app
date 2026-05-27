/**
 * JWT Authentication Middleware
 * 
 * Validates JWT token from request Authorization header and attaches userId to request.
 * Applied to all protected routes to ensure user is authenticated.
 * 
 * ARCHITECTURE:
 * - Middleware: Validates token and extracts userId
 * - Route handlers: Use (req as any).userId to access authenticated user
 * 
 * Token verification:
 * 1. Extract token from Authorization: Bearer <token> header
 * 2. Verify token signature and expiration using authService
 * 3. Extract userId from token payload
 * 4. Attach userId to request object
 * 5. Continue to next middleware/route handler if valid
 * 6. Return 401 if invalid or expired
 * 
 * @category Middleware
 * @module middleware/authMiddleware
 */

import { Request, Response, NextFunction } from "express";
import { authService } from "../modules/auth/auth.service";

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT token from Authorization header and attaches userId to request object.
 * Must be applied before route handlers that require authentication.
 * 
 * @middleware
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * Expected request format:
 * ```
 * Authorization: Bearer <jwt_token>
 * ```
 * 
 * Flow:
 * 1. Extract JWT token from Authorization header (Bearer scheme)
 * 2. Validate token signature and expiration using authService
 * 3. Extract userId from token payload
 * 4. Attach userId to request object (accessible as (req as any).userId)
 * 5. Continue to route handler if valid, reject if invalid
 * 
 * @returns {void} Calls next() if token valid, sends 401 response if invalid
 * 
 * @throws {401} No auth token provided
 * @throws {401} Invalid or expired token
 * 
 * @example
 * // Apply to a protected route:
 * router.get('/api/profile', authMiddleware, getUserProfile);
 * 
 * // Use in route handler:
 * const userId = (req as any).userId;
 * 
 * @example
 * // Valid request:
 * GET /api/profile
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * // Invalid request (no header):
 * GET /api/profile
 * Response: 401 Unauthorized - "No auth token provided"
 * 
 * // Invalid request (expired token):
 * GET /api/profile
 * Authorization: Bearer <expired_token>
 * Response: 401 Unauthorized - "Invalid or expired token"
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // STAGE 1: Extract token from Authorization header
    // Expected format: "Authorization: Bearer <token>"
    const authHeader = req.headers.authorization;

    // STAGE 2: Validate Authorization header exists and uses Bearer scheme
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No auth token provided" });
    }

    // STAGE 3: Extract token string (remove "Bearer " prefix)
    const token = authHeader.slice(7); // "Bearer ".length = 7

    // STAGE 4: Verify token signature and expiration using authService
    // This will throw if token is invalid or expired
    const decoded = authService.verifyAccessToken(token);

    // STAGE 5: Attach userId to request object for use in route handlers
    // Route handlers access via: (req as any).userId
    (req as any).userId = decoded.userId;

    // STAGE 6: Continue to next middleware/route handler
    next();
  } catch (error: any) {
    // Token verification failed (invalid signature, expired, or tampered)
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
