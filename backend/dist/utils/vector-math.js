"use strict";
/**
 * VECTOR UTILITIES FOR EMOTIONAL EMBEDDINGS
 *
 * Core mathematical operations for working with emotional vectors.
 * Used throughout recommendation engine for similarity, blending, distance calculations.
 *
 * @category Utils
 * @module utils/vector-math
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cosineSimilarity = cosineSimilarity;
exports.euclideanDistance = euclideanDistance;
exports.addVectors = addVectors;
exports.createNeutralVector = createNeutralVector;
exports.normalizeVector = normalizeVector;
exports.averageVectors = averageVectors;
exports.blendVectors = blendVectors;
exports.getPerDimensionDistances = getPerDimensionDistances;
exports.getMostDifferentDimensions = getMostDifferentDimensions;
exports.isValidVector = isValidVector;
exports.vectorToJSON = vectorToJSON;
exports.vectorFromJSON = vectorFromJSON;
/**
 * All 7 emotional dimensions in order
 * Used for consistent vector operations
 */
const DIMENSIONS = [
    "valence",
    "arousal",
    "tension",
    "warmth",
    "intimacy",
    "density",
    "groundedness",
];
/**
 * Calculate cosine similarity between two emotional vectors
 *
 * Returns 0-1 where:
 * - 1.0 = identical direction (same emotional profile)
 * - 0.5 = orthogonal (different but not opposite)
 * - 0.0 = opposite direction (contradictory emotions)
 *
 * Used as primary recommendation scoring metric.
 *
 * Formula: (A · B) / (||A|| * ||B||)
 *
 * @param {EmotionalVector} a - First vector
 * @param {EmotionalVector} b - Second vector
 *
 * @returns {number} Cosine similarity 0-1
 *
 * @example
 * const userProfile = { valence: 0.7, arousal: 0.5, ... };
 * const albumProfile = { valence: 0.65, arousal: 0.55, ... };
 * const similarity = cosineSimilarity(userProfile, albumProfile);
 * console.log(similarity);  // 0.98 (very similar)
 */
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (const dim of DIMENSIONS) {
        const aVal = a[dim];
        const bVal = b[dim];
        dotProduct += aVal * bVal;
        magnitudeA += aVal * aVal;
        magnitudeB += bVal * bVal;
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0; // handle zero vectors
    }
    return dotProduct / (magnitudeA * magnitudeB);
}
/**
 * Calculate Euclidean distance between two emotional vectors
 *
 * Returns distance in emotional space.
 * Smaller = more similar, larger = more different.
 *
 * Formula: sqrt(sum((a_i - b_i)^2))
 *
 * @param {EmotionalVector} a - First vector
 * @param {EmotionalVector} b - Second vector
 *
 * @returns {number} Euclidean distance (0 to ~2.6 for 0-1 vectors in 7D)
 *
 * @example
 * const distance = euclideanDistance(userProfile, albumProfile);
 * console.log(distance);  // 0.15 (close) vs 1.5 (far)
 */
function euclideanDistance(a, b) {
    let sumSquaredDiff = 0;
    for (const dim of DIMENSIONS) {
        const diff = a[dim] - b[dim];
        sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff);
}
/**
 * Add two vectors (element-wise addition)
 *
 * Primary use: blending user profile with context modifier
 * CurrentState = UserProfile + ContextModifier
 *
 * Handles partial vectors (ContextModifier may not have all dims).
 *
 * @param {EmotionalVector} base - Base vector
 * @param {Partial<EmotionalVector>|ContextModifier} delta - Delta to add
 *
 * @returns {EmotionalVector} Result vector
 *
 * @example
 * const userProfile = { valence: 0.5, arousal: 0.5, ... };
 * const weatherModifier = { warmth: 0.15, groundedness: 0.20 };
 * const currentState = addVectors(userProfile, weatherModifier);
 * // Result: { valence: 0.5, arousal: 0.5, ..., warmth: 0.65, groundedness: 0.70, ... }
 */
function addVectors(base, delta) {
    const result = { ...base };
    Object.keys(delta).forEach((dim) => {
        if (dim in DIMENSIONS && delta[dim] !== undefined) {
            result[dim] = Math.max(0, Math.min(1, (result[dim] ?? 0.5) + (delta[dim] ?? 0)));
        }
    });
    return result;
}
/**
 * Create a neutral "center" vector
 *
 * All dimensions = 0.5 (middle of range)
 *
 * Used for:
 * - Fallback when user profile unknown
 * - Initialization
 * - Baseline comparisons
 *
 * @returns {EmotionalVector}
 */
function createNeutralVector() {
    return {
        valence: 0.5,
        arousal: 0.5,
        tension: 0.5,
        warmth: 0.5,
        intimacy: 0.5,
        density: 0.5,
        groundedness: 0.5,
    };
}
/**
 * Normalize vector to ensure all dimensions are 0-1
 *
 * Clamps out-of-range values.
 * Used as safety net after mathematical operations.
 *
 * @param {EmotionalVector} vector
 * @returns {EmotionalVector} Normalized vector
 */
function normalizeVector(vector) {
    const result = { ...vector };
    for (const dim of DIMENSIONS) {
        result[dim] = Math.max(0, Math.min(1, result[dim]));
    }
    return result;
}
/**
 * Get average of multiple vectors (element-wise average)
 *
 * Primary use: computing user taste from multiple surveyed albums
 *
 * @param {EmotionalVector[]} vectors - Array of vectors
 *
 * @returns {EmotionalVector} Average vector
 *
 * @throws {Error} If array empty
 *
 * @example
 * const album1 = { valence: 0.7, arousal: 0.6, ... };
 * const album2 = { valence: 0.5, arousal: 0.8, ... };
 * const userTaste = averageVectors([album1, album2]);
 * // Result: { valence: 0.6, arousal: 0.7, ... }
 */
function averageVectors(vectors) {
    if (vectors.length === 0) {
        throw new Error("Cannot average empty vector array");
    }
    const sums = createNeutralVector();
    // Zero out sums first
    for (const dim of DIMENSIONS) {
        sums[dim] = 0;
    }
    // Sum all vectors
    for (const vector of vectors) {
        for (const dim of DIMENSIONS) {
            sums[dim] += vector[dim];
        }
    }
    // Average
    const result = { ...sums };
    for (const dim of DIMENSIONS) {
        result[dim] = sums[dim] / vectors.length;
    }
    return normalizeVector(result);
}
/**
 * Compute weighted blend of two vectors
 *
 * Primary use: blending user taste + weather context with custom weights
 *
 * Result = (vector1 * weight1) + (vector2 * weight2)
 *
 * @param {EmotionalVector} v1 - First vector
 * @param {number} w1 - Weight for first vector (0-1)
 * @param {EmotionalVector} v2 - Second vector
 * @param {number} w2 - Weight for second vector (0-1)
 *
 * @returns {EmotionalVector} Blended vector
 *
 * @example
 * const userProfile = { valence: 0.6, ... };
 * const weatherContext = { valence: 0.3, ... };
 * const currentState = blendVectors(userProfile, 0.6, weatherContext, 0.4);
 * // User preference dominates, weather influences
 */
function blendVectors(v1, w1, v2, w2) {
    const result = createNeutralVector();
    for (const dim of DIMENSIONS) {
        result[dim] = (v1[dim] * w1 + v2[dim] * w2) / (w1 + w2);
    }
    return normalizeVector(result);
}
/**
 * Get per-dimension distances (for debugging/analysis)
 *
 * Returns how far apart two vectors are in each dimension.
 * Useful for understanding recommendation decisions.
 *
 * @param {EmotionalVector} a
 * @param {EmotionalVector} b
 *
 * @returns {Record<keyof EmotionalVector, number>} Distance per dimension
 *
 * @example
 * const distances = getPerDimensionDistances(userProfile, albumProfile);
 * console.log(distances);
 * // { valence: 0.1, arousal: 0.05, ..., groundedness: 0.2 }
 */
function getPerDimensionDistances(a, b) {
    const distances = {};
    for (const dim of DIMENSIONS) {
        distances[dim] = Math.abs(a[dim] - b[dim]);
    }
    return distances;
}
/**
 * Find most different dimensions between two vectors
 *
 * Useful for:
 * - Understanding why recommendation failed
 * - Dimension importance analysis
 * - Debugging recommendation logic
 *
 * @param {EmotionalVector} a
 * @param {EmotionalVector} b
 * @param {number} topN - How many dimensions to return
 *
 * @returns {Array<[keyof EmotionalVector, number]>} Most different dims with distances
 *
 * @example
 * const differences = getMostDifferentDimensions(userProfile, albumProfile, 3);
 * console.log(differences);
 * // [["groundedness", 0.35], ["density", 0.28], ["arousal", 0.15]]
 */
function getMostDifferentDimensions(a, b, topN = 3) {
    const distances = getPerDimensionDistances(a, b);
    return Object.entries(distances)
        .sort((x, y) => y[1] - x[1])
        .slice(0, topN);
}
/**
 * Check if vector is valid (all dimensions 0-1)
 *
 * @param {EmotionalVector} vector
 * @returns {boolean}
 */
function isValidVector(vector) {
    for (const dim of DIMENSIONS) {
        const val = vector[dim];
        if (typeof val !== "number" || val < 0 || val > 1) {
            return false;
        }
    }
    return true;
}
/**
 * Convert vector to JSON (for storage/transmission)
 *
 * @param {EmotionalVector} vector
 * @returns {string} JSON representation
 */
function vectorToJSON(vector) {
    return JSON.stringify(vector);
}
/**
 * Parse vector from JSON
 *
 * @param {string} json
 * @returns {EmotionalVector}
 *
 * @throws {Error} If invalid JSON or invalid vector
 */
function vectorFromJSON(json) {
    const vector = JSON.parse(json);
    if (!isValidVector(vector)) {
        throw new Error("Invalid vector: dimensions out of range");
    }
    return vector;
}
