"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Similarity = exports.Normalization = exports.VectorMath = exports.averagePooling = exports.maxPooling = exports.harmonicMean = exports.dimensionSimilarities = exports.chebyshevDistance = exports.manhattanDistance = exports.pearsonCorrelation = exports.stringSimilarity = exports.levenshteinDistance = exports.jaccardSimilarity = exports.robustNormalize = exports.sigmoidNormalize = exports.zScoreNormalize = exports.minMaxNormalize = exports.normalizeToUnitLength = exports.clampVector = exports.addModifiers = exports.normalizeModifier = exports.sharpenContrast = exports.blendSignals = exports.vectorFromJSON = exports.vectorToJSON = exports.isValidVector = exports.getMostDifferentDimensions = exports.getPerDimensionDistances = exports.blendVectors = exports.averageVectors = exports.normalizeVector = exports.createNeutralVector = exports.addVectors = exports.euclideanDistance = exports.cosineSimilarityGeneric = exports.cosineSimilarity = exports.EMOTIONAL_DIMENSIONS = void 0;
// Vector operations
var vector_1 = require("./vector");
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
// Normalization operations
var normalization_1 = require("./normalization");
Object.defineProperty(exports, "normalizeModifier", { enumerable: true, get: function () { return normalization_1.normalizeModifier; } });
Object.defineProperty(exports, "addModifiers", { enumerable: true, get: function () { return normalization_1.addModifiers; } });
Object.defineProperty(exports, "clampVector", { enumerable: true, get: function () { return normalization_1.clampVector; } });
Object.defineProperty(exports, "normalizeToUnitLength", { enumerable: true, get: function () { return normalization_1.normalizeToUnitLength; } });
Object.defineProperty(exports, "minMaxNormalize", { enumerable: true, get: function () { return normalization_1.minMaxNormalize; } });
Object.defineProperty(exports, "zScoreNormalize", { enumerable: true, get: function () { return normalization_1.zScoreNormalize; } });
Object.defineProperty(exports, "sigmoidNormalize", { enumerable: true, get: function () { return normalization_1.sigmoidNormalize; } });
Object.defineProperty(exports, "robustNormalize", { enumerable: true, get: function () { return normalization_1.robustNormalize; } });
// Similarity & distance operations
var similarity_1 = require("./similarity");
Object.defineProperty(exports, "jaccardSimilarity", { enumerable: true, get: function () { return similarity_1.jaccardSimilarity; } });
Object.defineProperty(exports, "levenshteinDistance", { enumerable: true, get: function () { return similarity_1.levenshteinDistance; } });
Object.defineProperty(exports, "stringSimilarity", { enumerable: true, get: function () { return similarity_1.stringSimilarity; } });
Object.defineProperty(exports, "pearsonCorrelation", { enumerable: true, get: function () { return similarity_1.pearsonCorrelation; } });
Object.defineProperty(exports, "manhattanDistance", { enumerable: true, get: function () { return similarity_1.manhattanDistance; } });
Object.defineProperty(exports, "chebyshevDistance", { enumerable: true, get: function () { return similarity_1.chebyshevDistance; } });
Object.defineProperty(exports, "dimensionSimilarities", { enumerable: true, get: function () { return similarity_1.dimensionSimilarities; } });
Object.defineProperty(exports, "harmonicMean", { enumerable: true, get: function () { return similarity_1.harmonicMean; } });
Object.defineProperty(exports, "maxPooling", { enumerable: true, get: function () { return similarity_1.maxPooling; } });
Object.defineProperty(exports, "averagePooling", { enumerable: true, get: function () { return similarity_1.averagePooling; } });
// Export all as a namespace for convenience
exports.VectorMath = __importStar(require("./vector"));
exports.Normalization = __importStar(require("./normalization"));
exports.Similarity = __importStar(require("./similarity"));
