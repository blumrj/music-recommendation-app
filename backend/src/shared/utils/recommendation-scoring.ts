/**
 * RECOMMENDATION SCORING MODULE
 * 
 * Encapsulates multi-factor scoring logic for recommendations.
 * Separates scoring concerns from ranking/selection logic.
 * 
 * @category Utilities
 * @module recommendation-scoring
 */

import { EmotionalVector } from "../../types/embedding.dto";

/**
 * Score breakdown for a single album
 */
export interface ScoredAlbum {
  spotifyAlbumId: string;
  albumName: string;
  artist: string;
  imageUrl?: string;
  spotifyUrl?: string;
  emotionalScore: number;
  historyScore: number;
  noveltyScore: number;
  compositeScore: number;
  diversityScore?: number;
  finalScore?: number;
  embedding?: EmotionalVector;
}

/**
 * Compute emotional similarity between user state and album embedding
 * Using cosine similarity on 7D emotional space
 * 
 * @param userState User's 7D emotional vector
 * @param albumEmbedding Album's 7D emotional vector
 * @returns Similarity score [0, 1]
 */
export const computeEmotionalSimilarity = (
  userState: EmotionalVector,
  albumEmbedding: EmotionalVector
): number => {
  const dimensions = Object.keys(userState) as (keyof EmotionalVector)[];
  
  let dotProduct = 0;
  let userMagnitude = 0;
  let albumMagnitude = 0;
  
  for (const dim of dimensions) {
    const u = userState[dim] ?? 0.5;
    const a = albumEmbedding[dim] ?? 0.5;
    
    dotProduct += u * a;
    userMagnitude += u * u;
    albumMagnitude += a * a;
  }
  
  const denominator = Math.sqrt(userMagnitude) * Math.sqrt(albumMagnitude);
  return denominator === 0 ? 0.5 : dotProduct / denominator;
};

/**
 * Compute diversity score for an album relative to already-selected albums
 * Penalizes if same artist is already in selection
 * 
 * @param artist Album's artist name
 * @param selectedAlbums Albums already selected
 * @returns Diversity score [0, 1], lower = less diverse
 */
export const computeDiversityScore = (
  artist: string,
  selectedAlbums: any[]
): number => {
  if (selectedAlbums.length === 0) return 1.0; // First album is maximally diverse
  
  // Count how many albums by same artist already selected
  const sameArtistCount = selectedAlbums.filter(
    a => a.artist.toLowerCase() === artist.toLowerCase()
  ).length;
  
  // Penalty: 0.8, 0.5, 0.2, 0.0 for 1st, 2nd, 3rd, 4th+ duplicate artists
  const penaltyFactor = Math.pow(0.8, sameArtistCount);
  return penaltyFactor;
};

/**
 * Compute composite score from weighted factors
 * 
 * Weights:
 * - 55% Emotional similarity
 * - 20% History score
 * - 15% Novelty score
 * - 10% Diversity (applied separately)
 * 
 * @param emotionalScore [0, 1]
 * @param historyScore [0, 1]
 * @param noveltyScore [0, 1]
 * @returns Composite score before diversity [0, 1]
 */
export const computeCompositeScore = (
  emotionalScore: number,
  historyScore: number,
  noveltyScore: number
): number => {
  return 0.55 * emotionalScore + 0.2 * historyScore + 0.15 * noveltyScore;
};

/**
 * Compute final score combining composite and diversity
 * 
 * @param compositeScore [0, 1]
 * @param diversityScore [0, 1]
 * @returns Final score [0, 1]
 */
export const computeFinalScore = (
  compositeScore: number,
  diversityScore: number
): number => {
  return 0.9 * compositeScore + 0.1 * diversityScore;
};
