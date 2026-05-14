/**
 * USER PROFILE SERVICE - 13D EDITION
 * 
 * Computes 13D user taste profiles from surveyed album embeddings.
 * 
 * CORE IDEA:
 * Instead of mapping survey keywords to emotions (error-prone),
 * we compute user profile as the AVERAGE of album embeddings they've surveyed.
 * 
 * Example:
 * - User surveys 5 albums
 * - Each album has 13D embedding: [valence, arousal, warmth, ...]
 * - User profile = average([album1, album2, album3, album4, album5])
 * - Result: User profile is EXACTLY in the 13D space
 * 
 * BENEFITS:
 * ✅ No keyword mapping needed (less error-prone)
 * ✅ Uses actual computed embeddings (mathematically sound)
 * ✅ Automatically incorporates all features (implicit weighting)
 * ✅ User profile = weighted by albums they chose to survey
 * 
 * WORKFLOW:
 * 1. User completes 5+ surveys
 * 2. Get all surveyed album Spotify IDs
 * 3. Fetch their 13D embeddings (cached or computed)
 * 4. Average embeddings → 13D user profile
 * 5. Store in UserTasteProfile 13D fields
 * 6. Ready for recommendations!
 * 
 * @category Services
 * @module services/user-profile
 */

import { PrismaClient } from "@prisma/client";
import { albumEmbeddingService } from "./album/album-embedding.service";
import * as vectorMath from "../utils/vector-math";
import { EmotionalVector } from "../types/embedding.dto";

const prisma = new PrismaClient();

/**
 * User Profile Service - 13D
 * 
 * Computes and manages 13D user taste profiles from surveyed albums.
 * 
 * @class UserProfileService
 */
class UserProfileService {
  /**
   * Compute 13D user profile from surveyed albums + deviations
   * 
   * Algorithm:
   * 1. Fetch all surveyed albums (Spotify IDs + slider responses)
   * 2. For each album:
   *    a. Get/compute 13D embedding from Spotify audio features
   *    b. Get perceived 13D from user's 6 sliders
   *    c. Compute deviation = perceived - actual
   * 3. Average actual embeddings → User Profile
   * 4. Average deviations → User Emotional Deviations
   * 5. Store both in database
   * 
   * RESULT:
   * - User Profile: What they actually prefer (based on intrinsic album properties)
   * - Deviations: How user perceives differently from objective features
   * 
   * @async
   * @param {string} userId - User ID to compute profile for
   * 
   * @returns {Promise<Object>} Object with { taste: EmotionalVector, bias: EmotionalVector }
   * 
   * @throws {Error} "No surveys found" if user hasn't surveyed any albums
   * @throws {Error} "Failed to compute profile" on embedding fetch errors
   */
  async computeProfileFrom13DAlbums(userId: string): Promise<{ taste: EmotionalVector; bias: EmotionalVector }> {
    console.log(`[PROFILE] Computing 13D profile + deviations for user ${userId}...`);

    try {
      // STEP 1: Fetch all surveyed albums WITH their response data
      // Support both old and new survey formats for backward compatibility
      const surveys = await prisma.albumSurvey.findMany({
        where: { userId },
        select: {
          spotifyAlbumId: true,
          albumName: true,
          artist: true,
          imageUrl: true,
          // PHASE 1: New 7D survey responses (0-100 scale) - may be null for old surveys
          valence_response: true,
          arousal_response: true,
          tension_response: true,
          warmth_response: true,
          intimacy_response: true,
          density_response: true,
          groundedness_response: true
        }
      });

      if (surveys.length === 0) {
        throw new Error("No surveys found");
      }

      console.log(`[PROFILE] Found ${surveys.length} surveyed albums`);

      // STEP 2: For each album, get actual embedding + compute deviation
      const actualEmbeddings: EmotionalVector[] = [];
      const deviationVectors: EmotionalVector[] = [];
      let successCount = 0;

      for (const survey of surveys) {
        try {
          // Get or compute actual 13D embedding from Last.fm tags
          console.log(`[PROFILE] [ALBUM ${successCount + 1}] Retrieving embedding for "${survey.albumName}"...`);
          let actualEmbedding = await albumEmbeddingService.getEmbedding(survey.spotifyAlbumId);

          // If not cached, compute from Last.fm
          if (!actualEmbedding) {
            console.log(`[PROFILE] [ALBUM ${successCount + 1}] Cache miss for "${survey.albumName}" - computing from Last.fm...`);
            
            // Compute and cache embedding from Last.fm tags (no Spotify needed)
            const embedding = await albumEmbeddingService.getOrComputeEmbedding(
              survey.spotifyAlbumId,
              {},  // Empty object - not used for Last.fm-only approach
              {
                albumName: survey.albumName,
                artist: survey.artist,
                imageUrl: survey.imageUrl
              }
            );
            actualEmbedding = embedding;
          } else {
            console.log(`[PROFILE] [ALBUM ${successCount + 1}] ✓ Cache HIT for "${survey.albumName}"`);
          }

          // Get perceived profile from sliders
          const perceivedProfile = this.convertSurveyResponseTo13D(survey);

          // Compute deviation = perceived - actual
          const deviation: EmotionalVector = {
            valence: perceivedProfile.valence - actualEmbedding.valence,
            arousal: perceivedProfile.arousal - actualEmbedding.arousal,
            tension: perceivedProfile.tension - actualEmbedding.tension,
            warmth: perceivedProfile.warmth - actualEmbedding.warmth,
            intimacy: perceivedProfile.intimacy - actualEmbedding.intimacy,
            density: perceivedProfile.density - actualEmbedding.density,
            groundedness: perceivedProfile.groundedness - actualEmbedding.groundedness
          };

          actualEmbeddings.push(actualEmbedding);
          deviationVectors.push(deviation);
          successCount++;

          if (successCount <= 2) {
            console.log(`[PROFILE] Album ${successCount}: ${survey.albumName}`, {
              actual_valence: actualEmbedding.valence.toFixed(2),
              perceived_valence: perceivedProfile.valence.toFixed(2),
              deviation: deviation.valence.toFixed(2)
            });
          }
        } catch (error: any) {
          console.warn(
            `[PROFILE] Warning: Could not process ${survey.albumName}: ${error.message}`
          );
          // Continue with next survey
        }
      }

      if (actualEmbeddings.length === 0) {
        throw new Error("Could not process any surveyed albums");
      }

      // STEP 3: Average actual embeddings → Intrinsic Taste
      const intrinsicTaste = vectorMath.averageVectors(actualEmbeddings);

      // STEP 4: Average deviations → Perception Bias
      const perceptionBias = vectorMath.averageVectors(deviationVectors);

      console.log(`[PROFILE] ✓ Computed profile from ${successCount} actual album embeddings`);
      console.log(`[PROFILE] Intrinsic Taste: valence=${intrinsicTaste.valence.toFixed(2)}, arousal=${intrinsicTaste.arousal.toFixed(2)}, warmth=${intrinsicTaste.warmth.toFixed(2)}`);
      console.log(`[PROFILE] Perception Bias: valence=${perceptionBias.valence.toFixed(2)}, arousal=${perceptionBias.arousal.toFixed(2)}, warmth=${perceptionBias.warmth.toFixed(2)}`);

      return {
        taste: intrinsicTaste,
        bias: perceptionBias
      };
    } catch (error: any) {
      console.error(`[PROFILE] Failed to compute profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save 13D user profile to database
   * 
   * @async
   * @param {string} userId - User ID to save profile for
   * @param {Vector13D} profile - 13D user profile vector
   * 
   * @returns {Promise<Object>} Saved UserTasteProfile record
   * 
   * @throws {Error} On database errors
   * 
   * Algorithm:
   * - Upsert: update if exists, create if new
   * - Save all 13 dimensions
   * - Set albumsAnalyzed count
   * - Keep old 9D fields for backward compat (at neutral values)
   */
  async save13DProfile(userId: string, profileLayers: { taste: EmotionalVector; bias: EmotionalVector }): Promise<any> {
    console.log(`[PROFILE] Saving 13D profile + bias layers for user ${userId}...`);

    try {
      const surveyCount = await prisma.albumSurvey.count({ where: { userId } });
      const { taste, bias } = profileLayers;

      const savedProfile = await prisma.userTasteProfile.upsert({
        where: { userId },
        update: {
          // INTRINSIC TASTE LAYER (what albums user gravitates toward)
          valence: taste.valence,
          arousal: taste.arousal,
          tension: taste.tension,
          warmth: taste.warmth,
          intimacy: taste.intimacy,
          density: taste.density,
          groundedness: taste.groundedness,
          
          // PERCEPTION BIAS LAYER (how user emotionally reinterprets albums)
          bias_valence: bias.valence,
          bias_arousal: bias.arousal,
          bias_tension: bias.tension,
          bias_warmth: bias.warmth,
          bias_intimacy: bias.intimacy,
          bias_density: bias.density,
          bias_groundedness: bias.groundedness,
          
          albumsAnalyzed: surveyCount,
          updatedAt: new Date()
        },
        create: {
          userId,
          // INTRINSIC TASTE LAYER
          valence: taste.valence,
          arousal: taste.arousal,
          tension: taste.tension,
          warmth: taste.warmth,
          intimacy: taste.intimacy,
          density: taste.density,
          groundedness: taste.groundedness,
          
          // PERCEPTION BIAS LAYER
          bias_valence: bias.valence,
          bias_arousal: bias.arousal,
          bias_tension: bias.tension,
          bias_warmth: bias.warmth,
          bias_intimacy: bias.intimacy,
          bias_density: bias.density,
          bias_groundedness: bias.groundedness,
          
          albumsAnalyzed: surveyCount,
          // Keep legacy 9D at neutral for backward compat
          nature: 0.5,
          healing: 0.5,
          melancholy: 0.5,
          freedom: 0.5,
          energyLevel: 0.5,
          coziness: 0.5,
          dreaminess: 0.5
        }
      });

      console.log(`[PROFILE] ✓ SAVED both layers (${surveyCount} albums analyzed)`);
      console.log(`[PROFILE]   LAYER 1 - Intrinsic Taste Profile:`);
      console.log(`[PROFILE]     valence=${taste.valence.toFixed(2)}, arousal=${taste.arousal.toFixed(2)}, tension=${taste.tension.toFixed(2)}`);
      console.log(`[PROFILE]     warmth=${taste.warmth.toFixed(2)}, intimacy=${taste.intimacy.toFixed(2)}, density=${taste.density.toFixed(2)}, groundedness=${taste.groundedness.toFixed(2)}`);
      console.log(`[PROFILE]   LAYER 2 - Perception Bias Profile:`);
      console.log(`[PROFILE]     bias_valence=${bias.valence.toFixed(2)}, bias_arousal=${bias.arousal.toFixed(2)}, bias_tension=${bias.tension.toFixed(2)}`);
      console.log(`[PROFILE]     bias_warmth=${bias.warmth.toFixed(2)}, bias_intimacy=${bias.intimacy.toFixed(2)}, bias_density=${bias.density.toFixed(2)}, bias_groundedness=${bias.groundedness.toFixed(2)}`);
      return savedProfile;
    } catch (error: any) {
      console.error(`[PROFILE] Failed to save profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compute AND save 13D user profile (one-shot)
   * 
   * Convenience method that does both steps:
   * 1. Compute from actual embeddings
   * 2. Save to database
   * 
   * @async
   * @param {string} userId - User ID
   * 
   * @returns {Promise<Object>} Saved profile with taste and bias layers
   * 
   * @example
   * const profile = await userProfileService.generateAndSave13DProfile(userId);
   */
  async generateAndSave13DProfile(userId: string): Promise<any> {
    // Compute from surveyed albums with actual embeddings
    // Returns both intrinsic taste and perception bias layers
    const profileLayers = await this.computeProfileFrom13DAlbums(userId);

    // Save both layers to database
    const saved = await this.save13DProfile(userId, profileLayers);

    return saved;
  }


  /**
   * Convert 6 survey slider responses to 13D emotional vector
   * 
   * MAPPING STRATEGY:
   * The 6 sliders cover 6 of the 13 dimensions.
   * Unknown dimensions set to 0.5 (neutral).
   * 
   * SLIDER INTERPRETATION:
   * - intimacy_response: 0=intimate, 100=distant (INVERT to get 1=intimate, 0=distant)
   * - warmth_response: 0=warm, 100=cold (INVERT)
   * - groundedness_response: 0=grounded, 100=dreamy (direct - but we only fill groundedness)
   * - arousal_response: 0=calm, 100=energized (direct)
   * - introspection_response: 0=reflective, 100=external (INVERT)
   * - density_response: 0=dense, 100=sparse (fill both density and spaciousness)
   * 
   * @private
   * @param {Object} survey - Survey response object with slider values (0-100)
   * @returns {Vector13D} 13D vector representing user's perception
   */
  private convertSurveyResponseTo13D(survey: any): EmotionalVector {
    // Normalize all inputs to 0-1 scale
    const normalize = (value: number | null | undefined): number => {
      if (value === null || value === undefined) return 0.5; // Default to neutral
      return Math.max(0, Math.min(1, value / 100)); // Clamp to 0-1
    };

    // BACKWARD COMPATIBILITY: Handle old surveys that don't have new 7D fields
    // If new fields are missing (null), try to infer from old fields or use neutral
    
    // Valence (0=Sad, 100=Happy): old form didn't collect this, estimate from warmth + arousal
    let valence = normalize(survey.valence_response);
    if (survey.valence_response === null || survey.valence_response === undefined) {
      // If missing, estimate from warmth (correlation: warm albums tend to be happier)
      if (survey.warmth_response !== null && survey.warmth_response !== undefined) {
        valence = normalize(survey.warmth_response);  // Use warmth as proxy
      }
      // Otherwise stay at 0.5 (neutral)
    }
    
    // Tension (0=Relaxed, 100=Tense): old form didn't collect this
    // Estimate from arousal: high arousal can mean high tension
    let tension = normalize(survey.tension_response);
    if (survey.tension_response === null || survey.tension_response === undefined) {
      if (survey.arousal_response !== null && survey.arousal_response !== undefined) {
        // Tense albums tend to have moderate-to-high arousal
        // But not all high-arousal is tense (could be joyful)
        // Conservative: use 0.5 as default unless we have more data
        tension = 0.5;
      }
    }

    return {
      // PHASE 1: 7D survey responses (all 0-100 scale, normalized to 0-1)
      // With backward compatibility for old surveys
      valence: valence,
      arousal: normalize(survey.arousal_response),
      tension: tension,
      warmth: 1.0 - normalize(survey.warmth_response),       // INVERT: 0=warm, 100=cold → 1=warm, 0=cold
      intimacy: 1.0 - normalize(survey.intimacy_response),   // INVERT: 0=intimate, 100=distant → 1=intimate, 0=distant
      density: normalize(survey.density_response),
      groundedness: normalize(survey.groundedness_response)
    };
  }

}

export const userProfileService = new UserProfileService();
