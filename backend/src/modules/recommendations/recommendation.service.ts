/**
 * Recommendation Service - TWO-STAGE ALGORITHM (PHASE 4)
 * 
 * CORE ARCHITECTURE:
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Instead of returning top-K from one source, we use a TWO-STAGE pipeline:
 * 
 *   STAGE 1: CANDIDATE GENERATION (~50 albums)
 *   ────────────────────────────────────────
 *   Get diverse candidates from multiple sources:
 *   - Content-based: Albums similar in 13D space
 *   - Collaborative: Albums liked by similar users
 *   - Diversity: Different genres, different artists
 *   - Previous: Albums from past recommendations
 *   
 *   STAGE 2: MULTI-FACTOR RANKING (Return top 10)
 *   ──────────────────────────────────────────────
 *   Score each candidate using 4 factors:
 *   - 55% Emotional Similarity (13D cosine similarity)
 *   - 20% Listening History (saved/liked by user)
 *   - 15% Novelty (not recently recommended)
 *   - 10% Diversity (artist variety in result set)
 *   
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * BENEFITS OVER SINGLE-STAGE:
 * ✓ Diverse candidates = more exploration (not just similar to seed)
 * ✓ Multi-factor ranking = personalization beyond emotion
 * ✓ History awareness = respects user's listening patterns
 * ✓ Novelty boost = fresh recommendations over time
 * ✓ Diversity penalty = prevents artist over-representation
 * 
 * FORMULA - Multi-Factor Score:
 * ────────────────────────────
 *   Score = (0.55 × emotionalSim) +
 *           (0.20 × historyScore) +
 *           (0.15 × noveltyScore) +
 *           (0.10 × diversityScore)
 * 
 * Where:
 *   emotionalSim   ∈ [0,1]  (cosine similarity to user state)
 *   historyScore   ∈ [0,1]  (inverse recency of saves)
 *   noveltyScore   ∈ [0,1]  (inverse recency of recommendation)
 *   diversityScore ∈ [0,1]  (penalized by artist frequency in results)
 * 
 * @category Services
 * @module services/recommendation
 */

import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { albumEmbeddingService } from "../embeddings/album-embedding.orchestrator";
import { albumService } from "./albums.service";
import { candidatePoolService } from "../discovery/candidate-pool.service";
import { weatherService } from "../context/weather.service";
import { authService } from "../auth/auth.service";
import { userService } from "../users/users.service";
import * as vectorMath from "../../shared/math/vector";
import { EmotionalVector } from "../../types/embedding.dto";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

/**
 * Recommendation Service
 * 
 * Orchestrates the complete recommendation pipeline from user taste + weather to album suggestions.
 * 
 * @category Services
 * @class RecommendationService
 */
class RecommendationService {
  /**
   * Compute current user state: taste profile + context modifiers
   * 
   * REPLACES old blendProfileWithWeather with vector addition approach
   * 
   * @private
   * @param {Vector13D|null} userProfile - User's 13D taste profile (or null if new)
   * @param {Object} weatherContext - Weather context with modifier deltas
   * 
   * @returns {Vector13D} Current user state in 13D space
   * 
   * NEW APPROACH - ADDITIVE MODIFIERS:
   * Instead of: State = (User × 0.6) + (Weather × 0.4)
   * Now use:    State = UserProfile + WeatherModifier
   * 
   * This is SUBTLER and more ACCURATE:
   * - User profile stays stable (don't degrade it for weather)
   * - Context modifiers are soft adjustments [-0.3, +0.3] per dimension
   * - Multiple factors compound naturally (cold + rainy + night synergize)
   * - Result is always valid 13D vector (all dimensions 0-1)
   * 
   * FALLBACK BEHAVIOR:
   * - If no user profile: start from neutral (0.5 all dims), apply weather
   * - If no weather context: return user profile as-is
   * - If both missing: return neutral profile
   * 
   * @example
   * User profile: { valence: 0.7, arousal: 0.6, warmth: 0.4, ... }
   * Weather mod:  { warmth: +0.15, introspection: +0.20 }
   * Result:       { valence: 0.7, arousal: 0.6, warmth: 0.55, introspection: ...0.20+base... }
   */
  private computeCurrentUserState(
    userProfile: EmotionalVector | null,
    weatherContext: any,
    perceptionBias?: EmotionalVector
  ): EmotionalVector {
    // Start with user profile or neutral
    const baseProfile = userProfile ?? vectorMath.createNeutralVector();

    // Apply perception bias if available
    // Bias is softened to 50% - it gently shifts recommendations, not overrides them
    let stateWithBias = baseProfile;
    if (perceptionBias) {
      const softBias = {
        valence: perceptionBias.valence * 0.5,
        arousal: perceptionBias.arousal * 0.5,
        tension: perceptionBias.tension * 0.5,
        warmth: perceptionBias.warmth * 0.5,
        intimacy: perceptionBias.intimacy * 0.5,
        density: perceptionBias.density * 0.5,
        groundedness: perceptionBias.groundedness * 0.5
      };
      stateWithBias = vectorMath.addVectors(baseProfile, softBias);
      console.log("[RECS] Applied perception bias (50% strength) to user state");
    }

    // Apply weather context modifiers (additive, soft influence)
    if (weatherContext?.contextModifier) {
      return vectorMath.addVectors(stateWithBias, weatherContext.contextModifier);
    }

    return stateWithBias;
  }

  // ═════════════════════════════════════════════════════════════════════════════════
  // PHASE 4: STAGE 2 - MULTI-FACTOR RANKING (Score and rank candidates)
  // ═════════════════════════════════════════════════════════════════════════════════

  /**
   * Compute emotional similarity score (55% weight)
   * 
   * 13D cosine similarity between user state and album embedding
   * 
   * @private
   * @param {Vector13D} userState - User's current emotional state
   * @param {Vector13D} albumEmbedding - Album's 13D embedding
   * 
   * @returns {number} Similarity score [0, 1]
   */
  private computeEmotionalSimilarity(
    userState: EmotionalVector,
    albumEmbedding: EmotionalVector
  ): number {
    return vectorMath.cosineSimilarity(userState, albumEmbedding);
  }

  /**
   * Compute listening history score (20% weight)
   * 
   * Albums saved/liked by user get higher scores
   * Older saves get lower scores (more novelty to recent)
   * 
   * @private
   * @param {string} spotifyAlbumId - Album to score
   * @param {string} [userId] - User to check against
   * 
   * @returns {Promise<number>} History score [0, 1]
   */
  private async computeHistoryScore(spotifyAlbumId: string, userId?: string): Promise<number> {
    // Favorite table removed - return neutral score for all albums
    // TODO: When implementing album feedback feature, use RecommendationFeedback table instead
    return 0.5;
  }

  /**
   * Compute novelty score (15% weight)
   * 
   * Albums recently recommended get penalized
   * Novel albums (not recommended recently) get boosted
   * 
   * @private
   * @param {string} spotifyAlbumId - Album to score
   * @param {string} [userId] - User to check against
   * 
   * @returns {Promise<number>} Novelty score [0, 1]
   */
  private async computeNoveltyScore(spotifyAlbumId: string, userId?: string): Promise<number> {
    if (!userId) return 0.7; // Assume novel if no user

    try {
      // First find the album by spotifyId
      const album = await prisma.album.findUnique({
        where: { spotifyId: spotifyAlbumId },
        select: { id: true }
      });

      if (!album) return 1.0; // Album not in catalog = fully novel

      // Check most recent recommendation of this album to user
      const recentRec = await prisma.recommendation.findFirst({
        where: {
          userId,
          albumId: album.id
        },
        orderBy: {
          generatedAt: "desc"
        }
      });

      if (!recentRec) return 1.0; // Never recommended = fully novel

      // Score based on days since last recommendation
      const daysSinceRec = Math.floor(
        (Date.now() - recentRec.generatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Score: 0.2 if recommended today, up to 1.0 if >30 days
      return Math.min(1.0, 0.2 + (daysSinceRec / 30) * 0.8);
    } catch (error: any) {
      console.warn("[PHASE4-S2] Novelty score error:", error.message);
      return 0.7;
    }
  }

  /**
   * Compute diversity score (10% weight)
   * 
   * Penalizes albums by artists already in top results
   * Encourages artist variety in final recommendations
   * 
   * @private
   * @param {string} artist - Album's artist
   * @param {Array} selectedAlbums - Albums already selected
   * 
   * @returns {number} Diversity score [0, 1]
   */
  private computeDiversityScore(artist: string, selectedAlbums: any[]): number {
    // Count how many times this artist appears in selected
    const artistCount = selectedAlbums.filter((a) => a.artist === artist).length;

    // Penalize by artist frequency: 1.0 if new, 0.5 if 1 already, 0.2 if 2+
    if (artistCount === 0) return 1.0;
    if (artistCount === 1) return 0.5;
    return 0.2;
  }

  /**
   * STAGE 2: Multi-factor ranking
   * 
   * Scores and ranks all candidates using 4-factor model:
   * - 55% Emotional Similarity (13D)
   * - 20% Listening History
   * - 15% Novelty
   * - 10% Diversity
   * 
   * @private
   * @async
   * @param {Array} candidates - Candidate albums to rank
   * @param {Vector13D} userState - User's emotional state
   * @param {string} [userId] - User ID for history/novelty
   * 
   * @returns {Promise<Array>} Top 10 ranked albums
   */
  private async rankCandidates(
    candidates: any[],
    userState: EmotionalVector,
    userId?: string
  ): Promise<any[]> {
    console.log("[PHASE4-S2] Ranking candidates with 4-factor model...");

    const scored = await Promise.all(
      candidates.map(async (album) => {
        try {
          // Compute 13D embedding for this album
          const audioFeaturesObj: Record<string, number> = album.audioFeatures
            ? {
                danceability: album.audioFeatures.danceability || 0.5,
                energy: album.audioFeatures.energy || 0.5,
                loudness: album.audioFeatures.loudness || -30,
                speechiness: album.audioFeatures.speechiness || 0.1,
                acousticness: album.audioFeatures.acousticness || 0.5,
                instrumentalness: album.audioFeatures.instrumentalness || 0.2,
                liveness: album.audioFeatures.liveness || 0.2,
                valence: album.audioFeatures.valence || 0.5,
                tempo: album.audioFeatures.tempo || 120,
                mode: album.audioFeatures.mode || 1,
                key: album.audioFeatures.key || 0
              }
            : {
                danceability: 0.5,
                energy: 0.5,
                loudness: -30,
                speechiness: 0.1,
                acousticness: 0.5,
                instrumentalness: 0.2,
                liveness: 0.2,
                valence: 0.5,
                tempo: 120,
                mode: 1,
                key: 0
              };

          const embedding = await albumEmbeddingService.getOrComputeEmbedding(
            album.spotifyAlbumId,
            audioFeaturesObj,
            {
              albumName: album.albumName,
              artist: album.artist,
              imageUrl: album.imageUrl,
              spotifyUrl: album.spotifyUrl
            }
          );

          // Factor 1: Emotional Similarity (55%)
          const emotionalScore = this.computeEmotionalSimilarity(
            userState,
            embedding as EmotionalVector
          );

          // Factor 2: Listening History (20%)
          const historyScore = await this.computeHistoryScore(album.spotifyAlbumId, userId);

          // Factor 3: Novelty (15%)
          const noveltyScore = await this.computeNoveltyScore(album.spotifyAlbumId, userId);

          // Composite score (diversity applied per-album during selection)
          const compositeScore =
            0.55 * emotionalScore + 0.2 * historyScore + 0.15 * noveltyScore;
            // (0.1 diversity applied during final selection)

          return {
            ...album,
            emotionalScore,
            historyScore,
            noveltyScore,
            compositeScore,
            embedding
          };
        } catch (error: any) {
          console.warn("[PHASE4-S2] Scoring failed for album:", error.message);
          return {
            ...album,
            emotionalScore: 0.5,
            historyScore: 0.5,
            noveltyScore: 0.5,
            compositeScore: 0.5,
            embedding: null
          };
        }
      })
    );

    // Select top 10 with diversity penalty applied
    const selected: any[] = [];
    const sortedByScore = scored.sort((a, b) => b.compositeScore - a.compositeScore);

    for (const album of sortedByScore) {
      if (selected.length >= 10) break;

      // Apply diversity penalty for this album
      const diversityScore = this.computeDiversityScore(album.artist, selected);
      const finalScore =
        0.9 * album.compositeScore + 0.1 * diversityScore;

      // Add to results
      selected.push({
        ...album,
        finalScore,
        diversityScore
      });
    }

    console.log(
      `[PHASE4-S2] ✓ Ranked ${selected.length} albums, top artist: ${selected[0]?.artist}`
    );

    return selected;
  }

  /**
   * Generate recommendations - MAIN ENTRY POINT (PHASE 4: TWO-STAGE ALGORITHM)
   * 
   * @async
   * @param {string} spotifyToken - Valid Spotify access token
   * @param {number} lat - User latitude coordinate
   * @param {number} lon - User longitude coordinate
   * @param {string} [userId] - Optional: User ID from JWT (for profile/caching)
   * @param {string} [spotifyRefreshToken] - Optional: Refresh token for token renewal
   * 
   * @returns {Promise<Object>} Recommendation response
   * @returns {Array<Object>} returns.recommendations - Top 3 albums
   * @returns {string} returns.recommendations[].id - Spotify album ID
   * @returns {string} returns.recommendations[].name - Album title
   * @returns {string} returns.recommendations[].artist - Artist name
   * @returns {string} returns.recommendations[].image - Album cover URL
   * @returns {string} returns.recommendations[].spotifyUrl - Link to Spotify
   * @returns {string} returns.mood - Weather mood (Sunny, Rainy, etc.)
   * @returns {Object} returns.weather - Weather data
   * @returns {string} returns.weather.condition - Weather condition
   * @returns {number} returns.weather.temp - Temperature (Celsius)
   * @returns {number} returns.weather.humidity - Humidity percentage
   * @returns {boolean} returns.cached - Whether from cache
   * @returns {Date} returns.generatedAt - Generation timestamp
   * 
   * @throws {Error} Any error in pipeline stages
   * 
   * 12-STAGE ALGORITHM PIPELINE:
   * 
   * **STAGE 1: Preparation**
   * - Refresh Spotify token if needed (maintains API access)
   * - Load weather at coordinates
   * - Load user's taste profile (from surveys)
   * 
   * **STAGE 2: Personalization (Blending)**
   * - Blend user taste (60%) + weather mood (40%)
   * - Result: Personalized emotional profile
   * 
   * **STAGE 3: Discovery (Audio Analysis)**
   * - Extract seed artists from emotional dimensions
   * - Convert dimensions to Spotify audio targets
   * - Call Spotify /recommendations with targets
   * 
   * **STAGE 4: Filtering**
   * - Filter out albums user already saved
   * - Keep only new discovery candidates
   * 
   * **STAGE 5: Ranking**
   * - Score each by similarity to blended profile
   * - Sort by score (highest first)
   * - Return top 3
   * 
   * **STAGE 6: Cache**
   * - Save recommendations to database
   * - Fast retrieval on next request
   * 
   * RESULT:
   * User gets personalized recommendations that adapt to:
   * ✓ Their musical taste (from surveys)
   * ✓ Current weather/mood
   * ✓ Geographic location
   * ✓ Previously saved albums (no duplicates)
   * 
   * @example
   * const recommendations = await recommendationService.generateRecommendations(
   *   accessToken,
   *   40.7128,  // NYC latitude
   *   -74.0060, // NYC longitude
   *   userId,
   *   refreshToken
   * );
   * 
   * // Response:
   * // {
   * //   mood: "Rainy",
   * //   weather: { condition: "Rainy", temp: 15, humidity: 85 },
   * //   recommendations: [
   * //     { id: "...", name: "Album", artist: "Artist", image: "...", spotifyUrl: "..." }
   * //   ],
   * //   cached: false,
   * //   generatedAt: 2024-03-15T10:30:00Z
   * // }
   */


  async generateRecommendations(
    spotifyToken: string,
    lat: number,
    lon: number,
    userId?: string,
    spotifyRefreshToken?: string
  ): Promise<any> {
    try {
      console.log("\n" + "=".repeat(80));
      console.log("PHASE 4: TWO-STAGE RECOMMENDATION ALGORITHM");
      console.log("=".repeat(80));
      console.log(`[MAIN] Generating recommendations for user: ${userId || "anonymous"}`);
      console.log(`[MAIN] Location: ${lat}, ${lon}`);

      // STEP 0: CHECK CACHE (optional, disabled for testing new discovery)
      if (userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cached = await prisma.recommendation.findMany({
          where: {
            userId,
            generatedAt: { gte: today }
          },
          take: 10,
          include: {
            album: true  // Include album to get metadata
          }
        });

        if (cached.length >= 10) {
          console.log("[MAIN] ✓ Found cached recommendations");
          const cachedRecommendations = cached.map((r) => ({
            id: r.album.spotifyId,
            name: r.album.title,
            artist: r.album.artist,
            image: r.album.imageUrl,
            spotifyUrl: r.album.spotifyUrl,
            cached: true
          }));

          return {
            recommendations: cachedRecommendations,
            weather: { condition: "Cached", temp: 0, humidity: 0 },
            cached: true,
            generatedAt: cached[0].generatedAt
          };
        }
      }

      // STEP 1: REFRESH SPOTIFY TOKEN
      console.log("\n[MAIN] STEP 1: Refreshing Spotify token");
      let token = spotifyToken;
      if (userId && spotifyRefreshToken && spotifyRefreshToken.length > 0) {
        try {
          const newTokens = await authService.refreshAccessToken(spotifyRefreshToken);
          token = newTokens.access_token;
          
          // Update user's token in database for next use
          await prisma.user.update({
            where: { id: userId },
            data: { spotifyToken: token }
          });
          
          console.log("[MAIN]   ✓ Token refreshed");
        } catch (error: any) {
          console.warn("[MAIN]   ⚠️  Token refresh failed, continuing:", error.message);
        }
      }

      // STEP 2: GET WEATHER CONTEXT
      console.log("\n[MAIN] STEP 2: Fetching weather context");
      const weatherContext = await weatherService.getWeatherContextWithModifiers(lat, lon);
      console.log(`[MAIN]   ✓ Weather: ${weatherContext.condition}, ${weatherContext.temp}°C`);

      // STEP 3: LOAD USER PROFILE
      console.log("\n[MAIN] STEP 3: Loading user 13D taste profile + perception bias");
      let userProfile: EmotionalVector | null = null;
      let perceptionBias: EmotionalVector | null = null;
      if (userId) {
        const profileLayers = await userService.getUserTasteProfileWithBias13D(userId);
        if (profileLayers) {
          userProfile = profileLayers.taste;
          perceptionBias = profileLayers.bias;
          console.log(`[MAIN]   ✓ User profile found (with perception bias)`);
        } else {
          console.log(`[MAIN]   ⚠️  No profile yet (using neutral)`);
        }
      }

      // STEP 4: COMPUTE CURRENT USER STATE
      console.log("\n[MAIN] STEP 4: Computing user state (profile + bias + weather)");
      const currentUserState = this.computeCurrentUserState(
        userProfile,
        weatherContext,
        perceptionBias || undefined
      );
      console.log(
        `[MAIN]   ✓ User state computed in 13D space (valence=${currentUserState.valence.toFixed(2)}, arousal=${currentUserState.arousal.toFixed(2)})`
      );

      // ═════════════════════════════════════════════════════════════════════════════
      // PHASE 4 STAGE 1: CANDIDATE GENERATION
      // ═════════════════════════════════════════════════════════════════════════════

      console.log("\n" + "─".repeat(80));
      console.log("PHASE 4 - STAGE 1: CANDIDATE GENERATION");
      console.log("─".repeat(80));

      if (!userId) {
        console.warn("[PHASE4-S1] No userId provided - cannot generate Last.fm-based candidates");
        return {
          recommendations: [],
          weather: {
            condition: weatherContext.condition,
            temp: weatherContext.temp,
            humidity: weatherContext.humidity
          },
          cached: false,
          generatedAt: new Date()
        };
      }

      const candidates = await candidatePoolService.generateCandidatePool(userId, 0.1, 80);

      if (candidates.length === 0) {
        console.log("[MAIN] ⚠️  No candidates generated");
        return {
          recommendations: [],
          weather: {
            condition: weatherContext.condition,
            temp: weatherContext.temp,
            humidity: weatherContext.humidity
          },
          cached: false,
          generatedAt: new Date()
        };
      }

      console.log(`[MAIN] ✓ STAGE 1 complete: ${candidates.length} candidates`);

      // ═════════════════════════════════════════════════════════════════════════════
      // PHASE 4 STAGE 2: MULTI-FACTOR RANKING
      // ═════════════════════════════════════════════════════════════════════════════

      console.log("\n" + "─".repeat(80));
      console.log("PHASE 4 - STAGE 2: MULTI-FACTOR RANKING");
      console.log("─".repeat(80));

      const ranked = await this.rankCandidates(candidates, currentUserState, userId);

      if (ranked.length === 0) {
        console.log("[MAIN] ⚠️  No candidates ranked");
        return {
          recommendations: [],
          weather: {
            condition: weatherContext.condition,
            temp: weatherContext.temp,
            humidity: weatherContext.humidity
          },
          cached: false,
          generatedAt: new Date()
        };
      }

      // Format final recommendations (top 10)
      const topRecommendations = ranked.slice(0, 10).map(({ compositeScore, finalScore, emotionalScore, ...rest }) => ({
        id: rest.spotifyAlbumId,
        name: rest.albumName,
        artist: rest.artist,
        image: rest.imageUrl,
        spotifyUrl: rest.spotifyUrl,
        emotionalScore: emotionalScore.toFixed(3),
        finalScore: finalScore.toFixed(3)
      }));

      console.log(`[MAIN] ✓ STAGE 2 complete: Top 10 selected`);

      // STEP 3B: LOOKUP SPOTIFY URLs FOR LAST.FM ALBUMS
      console.log("\n[MAIN] STEP 3B: Enriching Spotify URLs for Last.fm candidates");
      for (const rec of topRecommendations) {
        // Check if URL is missing or is a search URL (not a direct Spotify link)
        if (!rec.spotifyUrl || rec.spotifyUrl.includes('?q=')) {
          console.log(`[MAIN]   Looking up Spotify ID for "${rec.name}" by ${rec.artist}...`);
          const spotifyUrl = await albumService.searchAlbumOnSpotify(rec.name, rec.artist, spotifyToken);
          if (spotifyUrl) {
            rec.spotifyUrl = spotifyUrl;
            console.log(`[MAIN]   ✓ Found: ${spotifyUrl}`);
          } else {
            console.log(`[MAIN]   ⚠️  Not found on Spotify, keeping original URL`);
          }
        }
      }

      // STEP 5: CACHE RECOMMENDATIONS
      console.log("\n[MAIN] STEP 5: Caching recommendations");
      if (userId && topRecommendations.length > 0) {
        try {
          // Only cache recommendations that have spotifyId (Spotify-backed)
          // Skip Last.fm-only recommendations (no stable ID)
          const spotifyBacked = topRecommendations.filter(rec => rec.id);
          
          if (spotifyBacked.length > 0) {
            // Create recommendations with albumId instead of raw album data
            const recsToCreate = [];
            
            for (const rec of spotifyBacked) {
              // Find or create album in global catalog
              let album = await prisma.album.findUnique({
                where: { spotifyId: rec.id! }
              });
              
              if (!album) {
                album = await prisma.album.create({
                  data: {
                    spotifyId: rec.id!,
                    title: rec.name,
                    artist: rec.artist,
                    imageUrl: rec.image || undefined,
                    spotifyUrl: rec.spotifyUrl || undefined
                  }
                });
              }
              
              recsToCreate.push({
                userId,
                albumId: album.id,
                lat,
                lon,
                generatedAt: new Date()
              });
            }
            
            await prisma.recommendation.createMany({
              data: recsToCreate
            });
            console.log(`[MAIN]   ✓ ${spotifyBacked.length} cached (${topRecommendations.length - spotifyBacked.length} Last.fm-only, not cached)`);
          } else {
            console.log(`[MAIN]   ℹ️  No Spotify-backed recommendations to cache (all Last.fm-only)`);
          }
        } catch (error: any) {
          console.warn("[MAIN]   ⚠️  Cache failed:", error.message);
        }
      }

      console.log("\n" + "=".repeat(80));
      console.log("✨ PHASE 4 COMPLETE - TOP 10 RECOMMENDATIONS READY");
      console.log("=".repeat(80) + "\n");

      return {
        recommendations: topRecommendations,
        weather: {
          condition: weatherContext.condition,
          temp: weatherContext.temp,
          humidity: weatherContext.humidity,
          season: weatherContext.season,
          timeOfDay: weatherContext.timeOfDay
        },
        cached: false,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error("[MAIN] Recommendation pipeline failed:", error);
      throw error;
    }
  }


}

/**
 * Recommendation Service instance
 * Singleton exported for use in controllers
 * 
 * Implements complete weather-based recommendation algorithm pipeline.
 * 
 * @type {RecommendationService}
 */
export const recommendationService = new RecommendationService();
