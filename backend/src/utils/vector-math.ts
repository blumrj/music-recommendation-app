/**
 * VECTOR UTILITIES - BACKWARD COMPATIBILITY LAYER
 * 
 * DEPRECATED: This file is maintained for backward compatibility only.
 * 
 * All canonical mathematical implementations have been moved to:
 *   src/shared/math/
 * 
 * This file re-exports all functions from there.
 * 
 * MIGRATION PATH:
 * ───────────────────────────────────────────────────────────────────
 * 
 * OLD (still works, but deprecated):
 *   import { cosineSimilarity, addVectors } from "../utils/vector-math";
 * 
 * NEW (preferred):
 *   import { cosineSimilarity, addVectors } from "../shared/math";
 * 
 * ───────────────────────────────────────────────────────────────────
 * 
 * Both imports produce identical behavior. Legacy code can continue to
 * work without modification. New code should import from shared/math.
 * 
 * @category Utils (DEPRECATED)
 * @module utils/vector-math
 */

// Re-export all vector operations from shared/math
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
} from "../shared/math/vector";

// Re-export normalization operations
export {
  normalizeModifier,
  addModifiers,
  clampVector,
  normalizeToUnitLength,
  minMaxNormalize,
  zScoreNormalize,
  sigmoidNormalize,
  robustNormalize,
} from "../shared/math/normalization";

// Re-export similarity operations
export {
  jaccardSimilarity,
  levenshteinDistance,
  stringSimilarity,
  cosineSimilarity as cosineSimilarityMetric,
  pearsonCorrelation,
  manhattanDistance,
  chebyshevDistance,
  dimensionSimilarities,
  harmonicMean,
  maxPooling,
  averagePooling,
} from "../shared/math/similarity";
