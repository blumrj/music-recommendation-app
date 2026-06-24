/**
 * Recommendation Service — Read-Only Catalog (Phase 3)
 *
 * Two-stage pipeline:
 *   Stage 1 — Load pre-embedded candidates from DB catalog (no external API calls)
 *   Stage 2 — Rank by emotional similarity (90%) + artist diversity penalty (10%)
 *
 * External I/O: OpenWeatherMap only (weather context modifier).
 * No Last.fm calls. No on-demand embedding computation.
 *
 * If the catalog has fewer than MIN_CATALOG_SIZE embedded albums, the endpoint
 * returns a catalog_not_ready error instead of a silent empty result.
 *
 * @category Services
 * @module services/recommendation
 */

import { candidatePoolService, EmbeddedAlbumCandidate } from "../discovery/candidate-pool.service";
import { weatherService } from "../context/weather.service";
import { userService } from "../users/users.service";
import { logger } from "../../shared/logger";
import * as vectorMath from "../../shared/math/vector";
import { EmotionalVector } from "../../types/embedding.dto";
import dotenv from "dotenv";

dotenv.config();

const MIN_CATALOG_SIZE = 10;

class RecommendationService {
  private computeCurrentUserState(
    userProfile: EmotionalVector | null,
    weatherContext: any
  ): EmotionalVector {
    const base = userProfile ?? vectorMath.createNeutralVector();
    if (weatherContext?.contextModifier) {
      return vectorMath.addVectors(base, weatherContext.contextModifier);
    }
    return base;
  }

  private computeDiversityScore(artist: string, selected: any[]): number {
    const count = selected.filter(a => a.artist === artist).length;
    if (count === 0) return 1.0;
    if (count === 1) return 0.5;
    return 0.2;
  }

  private scoreCandidates(
    candidates: EmbeddedAlbumCandidate[],
    userState: EmotionalVector
  ): Array<EmbeddedAlbumCandidate & { emotionalScore: number; compositeScore: number }> {
    return candidates.map(c => {
      const emotionalScore = vectorMath.cosineSimilarity(userState, c.embedding);
      return { ...c, emotionalScore, compositeScore: 0.9 * emotionalScore };
    });
  }

  private selectWithDiversity(
    scored: Array<EmbeddedAlbumCandidate & { emotionalScore: number; compositeScore: number }>
  ): Array<typeof scored[number] & { finalScore: number }> {
    const selected: Array<typeof scored[number] & { finalScore: number }> = [];
    const sorted = [...scored].sort((a, b) => b.compositeScore - a.compositeScore);

    for (const album of sorted) {
      if (selected.length >= 10) break;
      const diversity = this.computeDiversityScore(album.artist, selected);
      selected.push({ ...album, finalScore: 0.9 * album.compositeScore + 0.1 * diversity });
    }

    return selected;
  }

  private formatResult(ranked: ReturnType<typeof this.selectWithDiversity>) {
    return ranked.map(({ compositeScore: _c, finalScore, emotionalScore, ...rest }) => ({
      id: rest.albumId,
      name: rest.albumName,
      artist: rest.artist,
      image: rest.imageUrl,
      spotifyUrl: rest.spotifyUrl,
      emotionalScore: emotionalScore.toFixed(3),
      finalScore: finalScore.toFixed(3)
    }));
  }

  async generateRecommendations(
    _spotifyToken: string,
    lat: number,
    lon: number,
    userId?: string
  ): Promise<any> {
    if (!userId) {
      logger.warn("MAIN", "No userId — cannot generate recommendations");
      return { recommendations: [], generatedAt: new Date() };
    }

    // Guard: catalog must be seeded
    const catalogSize = await candidatePoolService.countEmbedded();
    if (catalogSize < MIN_CATALOG_SIZE) {
      logger.warn("MAIN", `Catalog too small: ${catalogSize} embedded albums (need ${MIN_CATALOG_SIZE})`);
      return {
        error: "catalog_not_ready",
        message: `Catalog has ${catalogSize} embedded albums. Run the catalog workers to build the catalog.`,
        recommendations: [],
        generatedAt: new Date()
      };
    }

    // Load weather + user profile
    const weatherContext = await weatherService.getWeatherContextWithModifiers(lat, lon);
    const profileLayers = await userService.getUserTasteProfileWithBias13D(userId);
    const userProfile = profileLayers?.taste ?? null;

    const userState = this.computeCurrentUserState(userProfile, weatherContext);

    // Stage 1: load pre-embedded candidates from DB
    const candidates = await candidatePoolService.getEmbeddedCatalog(userId);

    if (candidates.length === 0) {
      logger.warn("MAIN", "No candidates in catalog after filtering surveyed albums");
      return { recommendations: [], generatedAt: new Date() };
    }

    logger.info("MAIN", `Stage 1: ${candidates.length} candidates from catalog`);

    // Stage 2: rank by emotional similarity + diversity
    const scored = this.scoreCandidates(candidates, userState);
    const ranked = this.selectWithDiversity(scored);
    const recommendations = this.formatResult(ranked);

    logger.info("MAIN", `Stage 2: returning ${recommendations.length} recommendations`);

    return { recommendations, generatedAt: new Date() };
  }
}

export const recommendationService = new RecommendationService();
