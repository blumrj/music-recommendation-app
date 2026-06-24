"use strict";
/**
 * Spotify API Client Factory
 *
 * Creates axios instances for Spotify API calls with authentication and error handling.
 * All requests include Bearer token and error interception for token expiration.
 *
 * @category Utils
 * @module utils/spotify-client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpotifyClient = createSpotifyClient;
const axios_1 = __importDefault(require("axios"));
const SPOTIFY_BASE_URL = "https://api.spotify.com/v1";
/**
 * Create an axios instance configured for Spotify API
 *
 * Automatically adds Bearer token to all requests and handles 401 errors.
 *
 * @param {string} accessToken - Valid Spotify OAuth access token
 * @returns {AxiosInstance} Configured axios with Spotify authentication
 * @throws {Error} "Spotify token invalid or expired" on 401 response
 *
 * @example
 * const client = createSpotifyClient(accessToken);
 * const profile = await client.get('/me');
 */
function createSpotifyClient(accessToken) {
    if (!accessToken) {
        throw new Error("Spotify access token is required");
    }
    const client = axios_1.default.create({
        baseURL: SPOTIFY_BASE_URL,
        timeout: 10000, // Increased from 10s to 30s to handle slow Spotify servers
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
    });
    // Add request interceptor for logging
    client.interceptors.request.use((config) => {
        const authHeader = config.headers.Authorization;
        console.log(`[SPOTIFY-CLIENT] Request:`, {
            method: config.method,
            url: config.url,
            headers: {
                Authorization: authHeader ? authHeader.substring(0, 30) + '...' : 'NONE'
            }
        });
        return config;
    });
    // Add response interceptor for error handling
    client.interceptors.response.use((response) => {
        console.log(`[SPOTIFY-CLIENT] Response:`, {
            status: response.status,
            url: response.config.url
        });
        return response;
    }, (error) => {
        console.error(`[SPOTIFY-CLIENT] Response Error:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            data: error.response?.data,
            retryAfter: error.response?.headers?.['retry-after']
        });
        if (error.response?.status === 429) {
            // Rate limited by Spotify
            const retryAfter = error.response?.headers?.['retry-after'] || 60;
            throw new Error(`Spotify rate limit exceeded. Retry after ${retryAfter}s`);
        }
        if (error.response?.status === 401) {
            // Token expired or invalid
            throw new Error("Spotify token invalid or expired");
        }
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            throw new Error("Spotify API timeout - server may be overloaded or blocking requests");
        }
        throw error;
    });
    return client;
}
//# sourceMappingURL=spotify-client.js.map