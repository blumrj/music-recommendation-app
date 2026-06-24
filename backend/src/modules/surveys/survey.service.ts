/**
 * Survey Service
 * 
 * Business logic for survey responses and taste profile generation.
 * Orchestrates:
 * - Saving emotional survey responses to database (upsert pattern)
 * - Fetching survey data for analysis and UI display
 * - Analyzing surveys to generate 9D emotional taste profiles
 * - Managing available vs completed albums
 * 
 * Survey workflow:
 * 1. User completes survey for an album (emotions, vibes, contexts, etc.)
 * 2. Survey saved via saveSurveyResponse() with upsert pattern
 * 3. After 5+ surveys: User can call generateTasteProfile()
 * 4. Taste profile calculates 9 emotional dimensions (0-1 scale)
 * 5. Recommendations service uses taste profile for personalization
 * 
 * Database operations use Prisma ORM with upsert for idempotency.
 * 
 * @category Services
 * @module services/survey
 */

import { PrismaClient } from "@prisma/client";
import { SaveSurveyDTO } from "../../types/survey.dto";
import { FormattedAlbumDTO } from "../../types/spotify.dto";
import { albumService } from "../recommendations/albums.service";
import { albumClusteringService } from "../embeddings/album-clustering.service";
import { userProfileService } from "../users/user-profile.service";

const prisma = new PrismaClient();

/**
 * Survey Service
 * 
 * Manages survey responses and taste profile generation.
 * All database operations use Prisma ORM.
 * 
 * @class SurveyService
 */
class SurveyService {
  /**
   * Save or update a survey response for an album
   * 
   * @async
   * @param {SaveSurveyDTO} params - Survey data
   * @param {string} params.userId - User ID
   * @param {string} params.spotifyAlbumId - Spotify album ID
   * @param {string} params.albumName - Album title
   * @param {string} params.artist - Artist name
   * @param {string} params.imageUrl - Album cover URL
   * @param {Array<string>} params.seasons - Seasons for listening
   * @param {Array<string>} params.emotions - Emotions evoked
   * @param {Array<string>} params.whenYouListen - Listening contexts
   * @param {string} params.movementPreference - Music movement
   * @param {Array<string>} params.vibe - Vibes/moods
   * @param {string} params.optionalNote - Optional user comment
   * 
   * @returns {Promise<Object>} Saved survey record
   * 
   * @throws {Error} "Failed to save survey: [error details]"
   * 
   * Details:
   * - Uses Prisma upsert: if user already surveyed this album, update it; otherwise create
   * - Ensures only one survey per user-album combination (no duplicates)
   * - Updates: only survey fields and timestamp on re-survey
   * - Creates: full survey record if first time surveying album
   * 
   * @example
   * await surveyService.saveSurveyResponse({
   *   userId: "user123",
   *   spotifyAlbumId: "album456",
   *   albumName: "Album Title",
   *   artist: "Artist",
   *   imageUrl: "url...",
   *   seasons: ["autumn", "winter"],
   *   emotions: ["melancholic"],
   *   whenYouListen: ["studying"],
   *   movementPreference: "reflect",
   *   vibe: ["atmospheric"],
   *   optionalNote: "Great for studying"
   * });
   */
  async saveSurveyResponse(params: SaveSurveyDTO) {
    try {
      // Log incoming params for debugging
      console.log(`[SURVEY] Saving survey response for album: "${params.albumName}"`);
      console.log(`[SURVEY]   - Spotify ID: ${params.spotifyAlbumId}`);
      console.log(`[SURVEY]   - Artist: ${params.artist}`);
      console.log(`[SURVEY]   - ImageUrl: ${params.imageUrl ? `✓ (${params.imageUrl.substring(0, 50)}...)` : "❌ EMPTY"}`);

      // Step 1: Create or update Album, ALWAYS ensuring title, artist, and imageUrl are current
      // Look up album via AlbumExternalId (provider-agnostic identity)
      const existingExtId = await prisma.albumExternalId.findFirst({
        where: { provider: 'spotify', externalId: params.spotifyAlbumId },
        include: { album: true }
      });
      let album = existingExtId?.album ?? null;

      // If not found by Spotify external ID, check if it's a catalog album UUID
      if (!album) {
        const byInternalId = await prisma.album.findUnique({ where: { id: params.spotifyAlbumId } });
        if (byInternalId) {
          album = byInternalId;
          console.log(`[SURVEY]   - Found as catalog album by internal ID`);
        }
      }

      if (!album) {
        console.log(`[SURVEY]   - Creating new album record`);
        album = await prisma.album.create({
          data: {
            title: params.albumName,
            artist: params.artist,
            imageUrl: params.imageUrl || "",
            externalIds: {
              create: {
                provider: 'spotify',
                externalId: params.spotifyAlbumId,
                providerMetadata: {
                  url: `https://open.spotify.com/album/${params.spotifyAlbumId}`,
                  uri: `spotify:album:${params.spotifyAlbumId}`
                }
              }
            }
          }
        });
        console.log(`[SURVEY]   ✓ Album created with imageUrl: ${params.imageUrl ? 'YES' : 'EMPTY'}`);
      } else {
        // Always update existing album to ensure title, artist, imageUrl are current
        console.log(`[SURVEY]   - Album exists, updating with latest data (imageUrl: ${params.imageUrl ? 'PROVIDED' : 'NONE'})`);
        album = await prisma.album.update({
          where: { id: album.id },
          data: {
            title: params.albumName,
            artist: params.artist,
            imageUrl: params.imageUrl || album.imageUrl || ""
          }
        });
        console.log(`[SURVEY]   ✓ Album updated. Final imageUrl: ${album.imageUrl ? 'YES' : 'EMPTY'}`);
      }

      // Step 2: Create or update AlbumSurvey (marks survey as completed for this album)
      const survey = await prisma.albumSurvey.upsert({
        where: {
          userId_albumId: {
            userId: params.userId,
            albumId: album.id
          }
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          userId: params.userId,
          albumId: album.id
        }
      });

      // Step 3: Get all dimensions from database
      const dimensions = await prisma.dimension.findMany();
      
      // Create a map of dimension names to IDs
      const dimensionMap = new Map(dimensions.map(d => [d.name, d.id]));

      // Step 4: Save each dimension response to UserAlbumPerceptionDimension
      const dimensionResponses = [
        { name: 'valence', value: params.valence_response },
        { name: 'arousal', value: params.arousal_response },
        { name: 'tension', value: params.tension_response },
        { name: 'warmth', value: params.warmth_response },
        { name: 'intimacy', value: params.intimacy_response },
        { name: 'density', value: params.density_response },
        { name: 'groundedness', value: params.groundedness_response }
      ];

      for (const { name, value } of dimensionResponses) {
        if (value !== undefined && dimensionMap.has(name)) {
          await prisma.userAlbumPerceptionDimension.upsert({
            where: {
              userId_albumId_dimensionId: {
                userId: params.userId,
                albumId: album.id,
                dimensionId: dimensionMap.get(name)!
              }
            },
            update: {
              value: Math.round(value) // Ensure 0-100 integer
            },
            create: {
              userId: params.userId,
              albumId: album.id,
              dimensionId: dimensionMap.get(name)!,
              value: Math.round(value)
            }
          });
        }
      }

      console.log(`[SURVEY] Survey saved for album ${params.spotifyAlbumId}:`, {
        sliders: {
          valence: params.valence_response,
          arousal: params.arousal_response,
          tension: params.tension_response,
          warmth: params.warmth_response,
          intimacy: params.intimacy_response,
          density: params.density_response,
          groundedness: params.groundedness_response
        }
      });

      return survey;
    } catch (error: any) {
      throw new Error(`Failed to save survey: ${error.message}`);
    }
  }

  /**
   * Count surveys completed by a user
   * 
   * @async
   * @param {string} userId - User ID to count surveys for
   * 
   * @returns {Promise<number>} Total number of surveys completed
   * 
   * @throws {Error} "Failed to count surveys: [error details]"
   * 
   * Purpose: Determine if user has enough surveys (5+) to generate taste profile
   * 
   * @example
   * const count = await surveyService.getCompletedSurveyCount(userId);
   * if (count >= 5) {
   *   // User can generate taste profile
   * }
   */
  async getCompletedSurveyCount(userId: string): Promise<number> {
    try {
      // Simple count query - fast and doesn't fetch full survey data
      const count = await prisma.albumSurvey.count({
        where: { userId }
      });
      return count;
    } catch (error: any) {
      throw new Error(`Failed to count surveys: ${error.message}`);
    }
  }

  /**
   * Fetch all surveys for a user
   * 
   * @async
   * @param {string} userId - User ID to fetch surveys for
   * 
   * @returns {Promise<Array<Object>>} All survey records, newest first
   * 
   * @throws {Error} "Failed to fetch surveys: [error details]"
   * 
   * Purpose: Retrieve all emotional feedback data for taste profile generation
   * Ordered by creation date (newest first)
   * 
   * @example
   * const surveys = await surveyService.getAllSurveys(userId);
   * // surveys[0] = most recent survey
   */
  async getAllSurveys(userId: string) {
    try {
      // Get all albums surveyed by user, most recent first
      const surveys = await prisma.albumSurvey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });
      return surveys;
    } catch (error: any) {
      throw new Error(`Failed to fetch surveys: ${error.message}`);
    }
  }

  /**
   * Get user's surveyed albums (already analyzed)
   * 
   * @async
   * @param {string} userId - User ID to fetch surveys for
   * @param {number} [limit=10] - Maximum albums to return
   * 
   * @returns {Promise<Array<FormattedAlbumDTO>>} Surveyed albums, newest first
   * 
   * Details:
   * - Fetches survey records from database
   * - Transforms to FormattedAlbumDTO format
   * - Returns empty array on error (graceful fallback)
   * - Always returns newest surveys first
   * 
   * FormattedAlbumDTO fields:
   * - spotifyId: Album ID (primary key)
   * - name: Album title
   * - artist: Artist name
   * - imageUrl: Album cover URL
   * - spotifyUrl: Link to Spotify
   * 
   * @example
   * const surveyed = await surveyService.getSurveyedAlbums(userId, 10);
   * // Returns array of albums, most recent surveys first
   */
  async getSurveyedAlbums(userId: string, limit: number = 10): Promise<FormattedAlbumDTO[]> {
    try {
      // STAGE 1: Fetch survey records from database for this user
      const surveys = await prisma.albumSurvey.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          album: {
            include: { externalIds: { where: { provider: 'spotify' } } }
          }
        }
      });

      // STAGE 2: Transform survey records to FormattedAlbumDTO
      const result = surveys.map((survey) => {
        const spotifyExt = survey.album.externalIds[0];
        const spotifyId = spotifyExt?.externalId || '';
        const meta = spotifyExt?.providerMetadata as Record<string, string> | null;
        const spotifyUrl = meta?.url || (spotifyId ? `https://open.spotify.com/album/${spotifyId}` : '');
        return {
          spotifyId,
          name: survey.album.title,
          artist: survey.album.artist,
          imageUrl: survey.album.imageUrl || "",
          spotifyUrl,
        };
      });

      // Log for debugging image URLs
      if (result.length > 0) {
        console.log(`[SURVEY] Retrieved ${result.length} surveyed albums for user ${userId}`);
        result.slice(0, 2).forEach((album, i) => {
          console.log(`[SURVEY]   Album ${i + 1}: "${album.name}" - imageUrl: ${album.imageUrl ? `✓ (${album.imageUrl.substring(0, 50)}...)` : "❌ EMPTY"}`);
        });
      }

      return result;
    } catch (error) {
      console.error("Error fetching surveyed albums:", error);
      return [];
    }
  }

  /**
   * Get available albums for user to survey (unsurveyed only)
   * 
   * @async
   * @param {string} accessToken - Spotify OAuth access token
   * @param {string} userId - User ID to check surveyed albums against
   * @param {number} [limit=15] - Maximum Spotify albums to fetch
   * 
   * @returns {Promise<Array<FormattedAlbumDTO>>} Albums user hasn't surveyed
   * 
   * @throws {Error} If Spotify API call fails
   * 
   * Algorithm:
   * 1. STAGE 1: Fetch saved albums from Spotify (up to limit)
   * 2. STAGE 2: Get albums user already surveyed (creates Set for O(1) lookup)
   * 3. STAGE 3: Filter out surveyed albums (keep only NEW albums)
   * 4. STAGE 4: Return available albums for user to survey
   * 
   * Optimization: Uses Set for O(1) album ID lookup during filtering
   * 
   * @example
   * const available = await surveyService.getAvailableAlbumsForSurvey(token, userId, 15);
   * // Returns new albums user hasn't surveyed yet
   */
  async getAvailableAlbumsForSurvey(accessToken: string, userId: string, limit: number = 15): Promise<FormattedAlbumDTO[]> {
    try {
      // STAGE 1: Fetch all saved albums from Spotify
      const savedAlbums = await albumService.getSavedAlbumsFromSpotify(accessToken, limit * 2); // Get more for clustering
      
      // STAGE 2: Get already-surveyed albums
      const surveyedAlbums = await this.getSurveyedAlbums(userId);
      const surveyedIds = new Set(surveyedAlbums.map(a => a.spotifyId));
      
      // STAGE 3: Filter out surveyed albums
      const availableAlbums = savedAlbums.filter(
        (album: FormattedAlbumDTO) => !surveyedIds.has(album.spotifyId)
      );

      if (availableAlbums.length === 0) {
        console.log("[SURVEY] No available albums left to survey");
        return [];
      }

      // STAGE 4: Use clustering to select emotionally-diverse anchors (NEW - PHASE 0)
      console.log(`[SURVEY] Using clustering to select emotionally-diverse survey albums...`);
      const anchorAlbums = await albumClusteringService.selectSurveyAlbums(
        availableAlbums.map(a => ({
          spotifyAlbumId: a.spotifyId,
          albumName: a.name,
          artist: a.artist,
          imageUrl: a.imageUrl
        }))
      );

      // Convert Spotify anchors to FormattedAlbumDTO
      const spotifyAnchors: FormattedAlbumDTO[] = anchorAlbums.map(anchor => ({
        spotifyId: anchor.spotifyAlbumId,
        name: anchor.albumName,
        artist: anchor.artist,
        imageUrl: anchor.imageUrl || "",
        spotifyUrl: "",
        source: 'spotify' as const
      }));

      // Top up with catalog albums if fewer than 15 Spotify anchors
      const TARGET_COUNT = 15;
      if (spotifyAnchors.length < TARGET_COUNT) {
        const needed = TARGET_COUNT - spotifyAnchors.length;

        // Build exclusion set from anchor list (by normalized title+artist)
        const anchorKeys = new Set(spotifyAnchors.map(a =>
          `${a.name.toLowerCase().trim()}|${a.artist.toLowerCase().trim()}`
        ));

        // Get already-surveyed album IDs from DB (works for both Spotify + catalog albums)
        const surveyedRecords = await prisma.albumSurvey.findMany({
          where: { userId },
          select: { albumId: true }
        });
        const surveyedAlbumIds = surveyedRecords.map(r => r.albumId);

        const catalogAlbums = await prisma.album.findMany({
          where: {
            enrichmentStatus: "embedded",
            id: { notIn: surveyedAlbumIds }
          },
          select: { id: true, title: true, artist: true, imageUrl: true },
          take: needed * 3, // over-fetch to account for dedup
          orderBy: { embeddingComputedAt: "desc" }
        });

        const supplements: FormattedAlbumDTO[] = [];
        for (const a of catalogAlbums) {
          if (supplements.length >= needed) break;
          const key = `${a.title.toLowerCase().trim()}|${a.artist.toLowerCase().trim()}`;
          if (!anchorKeys.has(key)) {
            supplements.push({
              spotifyId: a.id, // internal UUID used as survey key
              name: a.title,
              artist: a.artist,
              imageUrl: a.imageUrl || "",
              spotifyUrl: "",
              source: 'catalog' as const
            });
          }
        }

        console.log(`[SURVEY] Supplemented with ${supplements.length} catalog albums`);
        return [...spotifyAnchors, ...supplements];
      }

      return spotifyAnchors;
    } catch (error) {
      console.error("Error getting available albums for survey:", error);
      throw error;
    }
  }

  /**
   * Generate and save taste profile for a user
   * 
   * @async
   * @param {string} userId - User ID to generate profile for
   * @param {Array<Object>} surveys - All survey records for user
   * 
   * @returns {Promise<Object>} Saved taste profile with emotional dimensions
   * 
   * @throws {Error} "Failed to generate taste profile: [error details]"
   * 
   * Algorithm:
   * 1. Analyze survey data using analyzeEmotionalProfile()
   * 2. Use Prisma upsert to save/update user's taste profile
   * 3. Update: new emotional dimensions and metadata on re-analysis
   * 4. Create: new profile if first time generating
   * 5. Store albumsAnalyzed count for future reference
   * 
   * Database fields saved:
   * - All 9 emotional dimensions (0-1 scale)
   * - dominantThemes, userType, preferredContexts, etc.
   * - albumsAnalyzed: count of surveys used
   * - updatedAt: timestamp
   * 
   * Called after: User completes 5+ surveys
   * Used by: Recommendation service for personalization
   * 
   * @example
   * const profile = await surveyService.generateTasteProfile(userId, surveys);
   * // Stores taste profile in database
   * // Ready for use in recommendation algorithm
   */
  async generateTasteProfile(userId: string, surveys: any[], spotifyAccessToken?: string) {
    try {
      console.log(
        `[SURVEY] Generating 13D profile for user ${userId} (${surveys.length} surveys)`
      );

      // PHASE 3B: Call new 13D user profile service with Spotify token
      // This:
      // 1. Fetches all surveyed albums
      // 2. Gets/computes their 13D embeddings from Last.fm tags (cached)
      // 3. Computes user perception from sliders
      // 4. Calculates deviations (perceived - actual)
      // 5. Averages embeddings for user profile
      // 6. Saves both profile and deviations
      const profile = await userProfileService.generateAndSave13DProfile(userId);

      console.log(`[SURVEY] ✓ Generated and saved 13D profile with deviations`);

      return profile;
    } catch (error: any) {
      throw new Error(`Failed to generate taste profile: ${error.message}`);
    }
  }

}

/**
 * Survey Service instance
 * Singleton exported for use in controllers and other services
 * 
 * @type {SurveyService}
 */
export const surveyService = new SurveyService();
