/**
 * LAST.FM API CLIENT FACTORY
 * 
 * Creates axios instances for Last.fm API calls with rate limiting protection.
 * 
 * ARCHITECTURE:
 * - On-demand fetching with database caching (prevents duplicate requests)
 * - Rate limit detection from response headers
 * - Throttling when approaching rate limit
 * - Exponential backoff on 429 (rate limited) responses
 * - Graceful error handling (returns empty array on any failure)
 * 
 * RATE LIMITING:
 * - Last.fm limit: ~600 requests per minute (~200ms per request min)
 * - We throttle when < 10% remaining
 * - On 429: wait 2x the suggested retry-after time
 * - Database caching prevents most repeat requests
 * 
 * @category Utils
 * @module utils/lastfm-client
 */

import axios, { AxiosInstance } from "axios";
import { LastfmAlbumTagsResponse, LastfmArtistTagsResponse, ParsedLastfmTag } from "../types/lastfm.dto";

const LASTFM_BASE_URL = "http://ws.audioscrobbler.com/2.0/";
const API_KEY = process.env.LASTFM_API_KEY || "";

// Rate limit tracking
interface RateLimitState {
  remaining: number;
  limit: number;
  resetTime: number;
  throttleUntil: number;
}

/**
 * Last.fm API Client with rate limit protection
 */
class LastfmClient {
  private client: AxiosInstance;
  private rateLimitState: RateLimitState = {
    remaining: 600,
    limit: 600,
    resetTime: 0,
    throttleUntil: 0
  };

  constructor() {
    if (!API_KEY) {
      console.warn("[LASTFM] Warning: LASTFM_API_KEY environment variable not set. Last.fm enrichment will be skipped.");
    }

    this.client = axios.create({
      baseURL: LASTFM_BASE_URL,
      timeout: 5000  // 5 second timeout (sufficient for Last.fm)
    });

    // Add SYNCHRONOUS request logging (no async operations in interceptor)
    this.client.interceptors.request.use((config) => {
      console.log(`[LASTFM-CLIENT] Request to:`, {
        method: (config.params as any)?.method,
        artist: (config.params as any)?.artist,
        album: (config.params as any)?.album,
        hasApiKey: !!API_KEY,
        rateLimitRemaining: this.rateLimitState.remaining
      });
      return config;
    });

    // Add response tracking & error handling
    this.client.interceptors.response.use(
      (response) => {
        // Update rate limit state from response headers
        this.updateRateLimitFromHeaders(response.headers as any);
        
        console.log(`[LASTFM-CLIENT] Response: status ${response.status}, remaining requests: ${this.rateLimitState.remaining}`);
        return response;
      },
      (error) => {
        // Handle 429 (rate limited) with exponential backoff
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          const backoffMs = retryAfter * 1000 * 2; // Double the suggested wait
          
          console.error(`[LASTFM-RATELIMIT] Hit rate limit! Backing off for ${backoffMs}ms`);
          this.rateLimitState.throttleUntil = Date.now() + backoffMs;
        }

        // Construct full URL for better debugging
        const params = error.config?.params as any;
        const fullUrl = params ? `${error.config?.baseURL}?${new URLSearchParams(params).toString()}` : error.config?.url;
        
        // Check if response is HTML (indicates wrong endpoint)
        const responseType = typeof error.response?.data;
        const isHtmlResponse = responseType === 'string' && error.response?.data?.includes('<');

        console.error(`[LASTFM-CLIENT] Error:`, {
          message: error.message,
          status: error.response?.status,
          url: fullUrl,
          method: params?.method,
          artist: params?.artist,
          isHtmlResponse,
          dataPreview: responseType === 'string' ? error.response?.data?.substring(0, 100) : error.response?.data
        });
        // Don't rethrow; return null for graceful degradation
        return null;
      }
    );
  }

  /**
   * Update rate limit state from Last.fm response headers
   * Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
   */
  private updateRateLimitFromHeaders(headers: any) {
    const limit = parseInt(headers['x-ratelimit-limit'] || '600', 10);
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '600', 10);
    const resetTime = parseInt(headers['x-ratelimit-reset'] || '0', 10);

    this.rateLimitState.limit = limit;
    this.rateLimitState.remaining = remaining;
    this.rateLimitState.resetTime = resetTime;

    // If less than 10% remaining, start throttling
    if (remaining < limit * 0.1) {
      const throttleMs = Math.max(500, (resetTime * 1000 - Date.now()) / 2); // At least 500ms, wait half of reset window
      this.rateLimitState.throttleUntil = Math.max(
        this.rateLimitState.throttleUntil,
        Date.now() + throttleMs
      );
      console.warn(`[LASTFM-RATELIMIT] Low on requests (${remaining}/${limit}), throttling enabled until reset at ${new Date(this.rateLimitState.resetTime * 1000).toISOString()}`);
    }
  }

  /**
   * Sleep helper for throttling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch top tags for an album
   * 
   * Returns empty array if:
   * - API call fails
   * - Album not found
   * - No API key configured
   * 
   * Never throws errors.
   * 
   * @param {string} artistName - Artist name
   * @param {string} albumName - Album name
   * @returns {Promise<ParsedLastfmTag[]>} Top tags (or empty array on failure)
   */
  async fetchAlbumTags(artistName: string, albumName: string): Promise<ParsedLastfmTag[]> {
    if (!API_KEY) {
      console.log(`[LASTFM] Skipping album tags (no API key): ${artistName} - ${albumName}`);
      return [];
    }

    // Check throttle state BEFORE making request
    if (this.rateLimitState.throttleUntil > Date.now()) {
      const waitMs = this.rateLimitState.throttleUntil - Date.now();
      console.warn(`[LASTFM-THROTTLE] Rate limit approaching, waiting ${waitMs}ms before request`);
      await this.sleep(waitMs);
    }

    try {
      console.log(`[LASTFM] Fetching album tags: ${artistName} - ${albumName}`);

      const response = await this.client.get<LastfmAlbumTagsResponse>("", {
        params: {
          method: "album.getTopTags",
          artist: artistName,
          album: albumName,
          autocorrect: 1,  // Auto-correct misspelled names
          api_key: API_KEY,
          format: "json"
        }
      });

      if (!response?.data?.toptags?.tag) {
        console.warn(`[LASTFM] No tags found for album: ${albumName}`);
        return [];
      }

      const tags = response.data.toptags.tag;
      const parsed = this.parseTags(tags);
      
      console.log(`[LASTFM] ✓ Got ${parsed.length} tags for album: ${albumName}`);
      parsed.forEach(t => console.log(`[LASTFM]   - ${t.tag} (${t.count})`));

      return parsed;
    } catch (error: any) {
      console.error(`[LASTFM] Failed to fetch album tags for ${albumName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch top tags for an artist (fallback if album not found)
   * 
   * Returns empty array if:
   * - API call fails
   * - Artist not found
   * - No API key configured
   * 
   * Never throws errors.
   * 
   * @param {string} artistName - Artist name
   * @returns {Promise<ParsedLastfmTag[]>} Top tags (or empty array on failure)
   */
  async fetchArtistTags(artistName: string): Promise<ParsedLastfmTag[]> {
    if (!API_KEY) {
      console.log(`[LASTFM] Skipping artist tags (no API key): ${artistName}`);
      return [];
    }

    // Check throttle state BEFORE making request
    if (this.rateLimitState.throttleUntil > Date.now()) {
      const waitMs = this.rateLimitState.throttleUntil - Date.now();
      console.warn(`[LASTFM-THROTTLE] Rate limit approaching, waiting ${waitMs}ms before request`);
      await this.sleep(waitMs);
    }

    try {
      console.log(`[LASTFM] Fetching artist tags (fallback): ${artistName}`);

      const response = await this.client.get<LastfmArtistTagsResponse>("", {
        params: {
          method: "artist.getTopTags",
          artist: artistName,
          autocorrect: 1,  // Auto-correct misspelled names
          api_key: API_KEY,
          format: "json"
        }
      });

      if (!response?.data?.toptags?.tag) {
        console.warn(`[LASTFM] No tags found for artist: ${artistName}`);
        return [];
      }

      const tags = response.data.toptags.tag;
      const parsed = this.parseTags(tags);

      console.log(`[LASTFM] ✓ Got ${parsed.length} tags for artist: ${artistName}`);
      parsed.forEach(t => console.log(`[LASTFM]   - ${t.tag} (${t.count})`));;

      return parsed;
    } catch (error: any) {
      console.error(`[LASTFM] Failed to fetch artist tags for ${artistName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse Last.fm tag response format to internal format
   * 
   * Last.fm returns counts as strings, we parse to numbers.
   * 
   * @private
   * @param {any[]} tags - Raw tags from Last.fm API
   * @returns {ParsedLastfmTag[]} Parsed tags
   */
  private parseTags(tags: any[]): ParsedLastfmTag[] {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .map(t => ({
        tag: (t.name || t.tag || "").toLowerCase().trim(),
        count: parseInt(t.count || "0", 10) || 0,
        url: t.url
      }))
      .filter(t => t.tag.length > 0)  // Remove empty tags
      .sort((a, b) => b.count - a.count)  // Sort by popularity
      .slice(0, 15);  // Top 15 tags
  }

  /**
   * Get similar artists from Last.fm
   * 
   * Returns empty array if API call fails or artist not found.
   * 
   * @param {string} artistName - Artist name
   * @param {number} limit - Maximum similar artists to return
   * @returns {Promise<any[]>} Array of similar artist objects
   */
  async getSimilarArtists(artistName: string, limit: number = 15): Promise<any[]> {
    if (!API_KEY) {
      console.log(`[LASTFM] Skipping similar artists (no API key): ${artistName}`);
      return [];
    }

    // Check throttle state
    if (this.rateLimitState.throttleUntil > Date.now()) {
      const waitMs = this.rateLimitState.throttleUntil - Date.now();
      console.warn(`[LASTFM-THROTTLE] Rate limit approaching, waiting ${waitMs}ms`);
      await this.sleep(waitMs);
    }

    try {
      console.log(`[LASTFM] Getting similar artists for "${artistName}"...`);

      const response = await this.client.get("", {
        params: {
          method: "artist.getSimilar",
          artist: artistName,
          limit,
          autocorrect: 1,
          api_key: API_KEY,
          format: "json"
        }
      });

      if (!response?.data?.similarartists?.artist) {
        console.warn(`[LASTFM] No similar artists found for "${artistName}"`);
        return [];
      }

      const artists = response.data.similarartists.artist;
      console.log(`[LASTFM] ✓ Got ${artists.length} similar artists for "${artistName}"`);
      
      return Array.isArray(artists) ? artists : [artists];
    } catch (error: any) {
      console.error(`[LASTFM] Error getting similar artists for "${artistName}":`, error.message);
      return [];
    }
  }

  /**
   * Get top albums from an artist
   * 
   * Returns empty array if API call fails or artist not found.
   * 
   * @param {string} artistName - Artist name
   * @param {number} limit - Maximum albums to return
   * @returns {Promise<any[]>} Array of album objects
   */
  async getTopAlbumsByArtist(artistName: string, limit: number = 10): Promise<any[]> {
    if (!API_KEY) {
      console.log(`[LASTFM] Skipping artist albums (no API key): ${artistName}`);
      return [];
    }

    // Check throttle state
    if (this.rateLimitState.throttleUntil > Date.now()) {
      const waitMs = this.rateLimitState.throttleUntil - Date.now();
      console.warn(`[LASTFM-THROTTLE] Rate limit approaching, waiting ${waitMs}ms`);
      await this.sleep(waitMs);
    }

    try {
      console.log(`[LASTFM] Getting top ${limit} albums for "${artistName}"...`);

      const response = await this.client.get("", {
        params: {
          method: "artist.getTopAlbums",
          artist: artistName,
          limit,
          autocorrect: 1,
          api_key: API_KEY,
          format: "json"
        }
      });

      if (!response?.data?.topalbums?.album) {
        console.warn(`[LASTFM] No albums found for artist "${artistName}"`);
        return [];
      }

      const albums = response.data.topalbums.album;
      console.log(`[LASTFM] ✓ Got ${Array.isArray(albums) ? albums.length : 1} albums for "${artistName}"`);
      
      return Array.isArray(albums) ? albums : [albums];
    } catch (error: any) {
      console.error(`[LASTFM] Error getting top albums for "${artistName}":`, error.message);
      return [];
    }
  }

  /**
   * Get top albums by tag
   * 
   * Returns empty array if API call fails or tag not found.
   * 
   * @param {string} tagName - Tag name
   * @param {number} limit - Maximum albums to return
   * @returns {Promise<any[]>} Array of album objects
   */
  async getTopAlbumsByTag(tagName: string, limit: number = 10): Promise<any[]> {
    if (!API_KEY) {
      console.log(`[LASTFM] Skipping tag albums (no API key): ${tagName}`);
      return [];
    }

    // Check throttle state
    if (this.rateLimitState.throttleUntil > Date.now()) {
      const waitMs = this.rateLimitState.throttleUntil - Date.now();
      console.warn(`[LASTFM-THROTTLE] Rate limit approaching, waiting ${waitMs}ms`);
      await this.sleep(waitMs);
    }

    try {
      console.log(`[LASTFM] Getting top ${limit} albums for tag "${tagName}"...`);

      const response = await this.client.get("", {
        params: {
          method: "tag.getTopAlbums",
          tag: tagName,
          limit,
          api_key: API_KEY,
          format: "json"
        }
      });

      if (!response?.data?.albums?.album) {
        console.warn(`[LASTFM] No albums found for tag "${tagName}"`);
        return [];
      }

      const albums = response.data.albums.album;
      console.log(`[LASTFM] ✓ Got ${Array.isArray(albums) ? albums.length : 1} albums for tag "${tagName}"`);
      
      return Array.isArray(albums) ? albums : [albums];
    } catch (error: any) {
      console.error(`[LASTFM] Error getting albums for tag "${tagName}":`, error.message);
      return [];
    }
  }
}

export const lastfmClient = new LastfmClient();
