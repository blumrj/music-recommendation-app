"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.averagePooling = exports.maxPooling = exports.harmonicMean = exports.dimensionSimilarities = exports.chebyshevDistance = exports.manhattanDistance = exports.pearsonCorrelation = exports.cosineSimilarityMetric = exports.stringSimilarity = exports.levenshteinDistance = exports.jaccardSimilarity = exports.robustNormalize = exports.sigmoidNormalize = exports.zScoreNormalize = exports.minMaxNormalize = exports.normalizeToUnitLength = exports.clampVector = exports.addModifiers = exports.normalizeModifier = exports.sharpenContrast = exports.blendSignals = exports.vectorFromJSON = exports.vectorToJSON = exports.isValidVector = exports.getMostDifferentDimensions = exports.getPerDimensionDistances = exports.blendVectors = exports.averageVectors = exports.normalizeVector = exports.createNeutralVector = exports.addVectors = exports.euclideanDistance = exports.cosineSimilarityGeneric = exports.cosineSimilarity = exports.EMOTIONAL_DIMENSIONS = void 0;
// Re-export all vector operations from shared/math
var vector_1 = require("../shared/math/vector");
Object.defineProperty(exports, "EMOTIONAL_DIMENSIONS", { enumerable: true, get: function () { return vector_1.EMOTIONAL_DIMENSIONS; } });
Object.defineProperty(exports, "cosineSimilarity", { enumerable: true, get: function () { return vector_1.cosineSimilarity; } });
Object.defineProperty(exports, "cosineSimilarityGeneric", { enumerable: true, get: function () { return vector_1.cosineSimilarityGeneric; } });
Object.defineProperty(exports, "euclideanDistance", { enumerable: true, get: function () { return vector_1.euclideanDistance; } });
Object.defineProperty(exports, "addVectors", { enumerable: true, get: function () { return vector_1.addVectors; } });
Object.defineProperty(exports, "createNeutralVector", { enumerable: true, get: function () { return vector_1.createNeutralVector; } });
Object.defineProperty(exports, "normalizeVector", { enumerable: true, get: function () { return vector_1.normalizeVector; } });
Object.defineProperty(exports, "averageVectors", { enumerable: true, get: function () { return vector_1.averageVectors; } });
Object.defineProperty(exports, "blendVectors", { enumerable: true, get: function () { return vector_1.blendVectors; } });
Object.defineProperty(exports, "getPerDimensionDistances", { enumerable: true, get: function () { return vector_1.getPerDimensionDistances; } });
Object.defineProperty(exports, "getMostDifferentDimensions", { enumerable: true, get: function () { return vector_1.getMostDifferentDimensions; } });
Object.defineProperty(exports, "isValidVector", { enumerable: true, get: function () { return vector_1.isValidVector; } });
Object.defineProperty(exports, "vectorToJSON", { enumerable: true, get: function () { return vector_1.vectorToJSON; } });
Object.defineProperty(exports, "vectorFromJSON", { enumerable: true, get: function () { return vector_1.vectorFromJSON; } });
Object.defineProperty(exports, "blendSignals", { enumerable: true, get: function () { return vector_1.blendSignals; } });
Object.defineProperty(exports, "sharpenContrast", { enumerable: true, get: function () { return vector_1.sharpenContrast; } });
// Re-export normalization operations
var normalization_1 = require("../shared/math/normalization");
Object.defineProperty(exports, "normalizeModifier", { enumerable: true, get: function () { return normalization_1.normalizeModifier; } });
Object.defineProperty(exports, "addModifiers", { enumerable: true, get: function () { return normalization_1.addModifiers; } });
Object.defineProperty(exports, "clampVector", { enumerable: true, get: function () { return normalization_1.clampVector; } });
Object.defineProperty(exports, "normalizeToUnitLength", { enumerable: true, get: function () { return normalization_1.normalizeToUnitLength; } });
Object.defineProperty(exports, "minMaxNormalize", { enumerable: true, get: function () { return normalization_1.minMaxNormalize; } });
Object.defineProperty(exports, "zScoreNormalize", { enumerable: true, get: function () { return normalization_1.zScoreNormalize; } });
Object.defineProperty(exports, "sigmoidNormalize", { enumerable: true, get: function () { return normalization_1.sigmoidNormalize; } });
Object.defineProperty(exports, "robustNormalize", { enumerable: true, get: function () { return normalization_1.robustNormalize; } });
// Re-export similarity operations
var similarity_1 = require("../shared/math/similarity");
Object.defineProperty(exports, "jaccardSimilarity", { enumerable: true, get: function () { return similarity_1.jaccardSimilarity; } });
Object.defineProperty(exports, "levenshteinDistance", { enumerable: true, get: function () { return similarity_1.levenshteinDistance; } });
Object.defineProperty(exports, "stringSimilarity", { enumerable: true, get: function () { return similarity_1.stringSimilarity; } });
Object.defineProperty(exports, "cosineSimilarityMetric", { enumerable: true, get: function () { return similarity_1.cosineSimilarity; } });
Object.defineProperty(exports, "pearsonCorrelation", { enumerable: true, get: function () { return similarity_1.pearsonCorrelation; } });
Object.defineProperty(exports, "manhattanDistance", { enumerable: true, get: function () { return similarity_1.manhattanDistance; } });
Object.defineProperty(exports, "chebyshevDistance", { enumerable: true, get: function () { return similarity_1.chebyshevDistance; } });
Object.defineProperty(exports, "dimensionSimilarities", { enumerable: true, get: function () { return similarity_1.dimensionSimilarities; } });
Object.defineProperty(exports, "harmonicMean", { enumerable: true, get: function () { return similarity_1.harmonicMean; } });
Object.defineProperty(exports, "maxPooling", { enumerable: true, get: function () { return similarity_1.maxPooling; } });
Object.defineProperty(exports, "averagePooling", { enumerable: true, get: function () { return similarity_1.averagePooling; } });
//# sourceMappingURL=vector-math.js.map