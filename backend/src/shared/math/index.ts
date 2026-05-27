/**
 * SHARED MATH MODULE - CANONICAL IMPLEMENTATIONS
 * 
 * Single source of truth for all mathematical operations.
 * 
 * All services should import from here, not reimplement math.
 * 
 * @category Shared Math
 * @module shared/math
 */

// Vector operations
export {
  EMOTIONAL_DIMENSIONS,
  cosineSimilarity,
  cosineSimilarityGeneric,
  euclideanDistance,
  addVectors,
  createNeutralVector,
  normalizeVector,
  averageVectors,
  blendVectors,
  getPerDimensionDistances,
  getMostDifferentDimensions,
  isValidVector,
  vectorToJSON,
  vectorFromJSON,
  blendSignals,
  sharpenContrast,
} from "./vector";

// Normalization operations
export {
  normalizeModifier,
  addModifiers,
  clampVector,
  normalizeToUnitLength,
  minMaxNormalize,
  zScoreNormalize,
  sigmoidNormalize,
  robustNormalize,
} from "./normalization";

// Similarity & distance operations
export {
  jaccardSimilarity,
  levenshteinDistance,
  stringSimilarity,
  pearsonCorrelation,
  manhattanDistance,
  chebyshevDistance,
  dimensionSimilarities,
  harmonicMean,
  maxPooling,
  averagePooling,
} from "./similarity";

// Export all as a namespace for convenience
export * as VectorMath from "./vector";
export * as Normalization from "./normalization";
export * as Similarity from "./similarity";
