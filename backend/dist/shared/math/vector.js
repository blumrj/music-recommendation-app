"use strict";
/**
 * VECTOR MATHEMATICS - CANONICAL IMPLEMENTATION
 *
 * Core mathematical operations for working with emotional vectors.
 * Single source of truth for all vector operations across the system.
 *
 * Used by:
 * - Recommendation scoring (cosine similarity)
 * - Embedding fusion (blending multiple signals)
 * - Context application (adding weather modifiers)
 * - User profiling (averaging user taste)
 *
 * @category Shared Math
 * @module shared/math/vector
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOTIONAL_DIMENSIONS = void 0;
exports.cosineSimilarity = cosineSimilarity;
exports.cosineSimilarityGeneric = cosineSimilarityGeneric;
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
exports.blendSignals = blendSignals;
exports.sharpenContrast = sharpenContrast;
/**
 * All 7 emotional dimensions in order
 * Used for consistent vector operations across all services
 */
exports.EMOTIONAL_DIMENSIONS = [
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
 * This is the CANONICAL implementation - all code should use this instead of reimplementing.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity 0-1
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
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
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
 * Calculate cosine similarity for any-dimensional vectors (e.g., word embeddings)
 *
 * Generic version that works with arrays of any length.
 * Used for 300D FastText embeddings and other non-7D vectors.
 *
 * Formula: (A · B) / (||A|| * ||B||)
 *
 * @param vec1 - First vector (any dimension)
 * @param vec2 - Second vector (must match vec1 length)
 * @returns Similarity score 0-1 where 1 = identical, 0 = orthogonal
 *
 * @throws {Error} If vectors have different dimensions
 */
function cosineSimilarityGeneric(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error(`Vector dimension mismatch: ${vec1.length} vs ${vec2.length}`);
    }
    // Dot product
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
    }
    // Magnitudes
    let mag1 = 0;
    let mag2 = 0;
    for (let i = 0; i < vec1.length; i++) {
        mag1 += vec1[i] * vec1[i];
        mag2 += vec2[i] * vec2[i];
    }
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    if (mag1 === 0 || mag2 === 0) {
        return 0;
    }
    return dotProduct / (mag1 * mag2);
}
/**
 * Calculate Euclidean distance between two emotional vectors
 *
 * Returns distance in emotional space.
 * Smaller = more similar, larger = more different.
 *
 * Formula: sqrt(sum((a_i - b_i)^2))
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Euclidean distance (0 to ~2.6 for 0-1 vectors in 7D)
 *
 * @example
 * const distance = euclideanDistance(userProfile, albumProfile);
 * console.log(distance);  // 0.15 (close) vs 1.5 (far)
 */
function euclideanDistance(a, b) {
    let sumSquaredDiff = 0;
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
        const diff = a[dim] - b[dim];
        sumSquaredDiff += diff * diff;
    }
    return Math.sqrt(sumSquaredDiff);
}
/**
 * Add two vectors (element-wise addition with clamping)
 *
 * Primary use: blending user profile with context modifier
 * CurrentState = UserProfile + ContextModifier
 *
 * Handles partial vectors (ContextModifier may not have all dims).
 * Results are clamped to 0-1 range.
 *
 * @param base - Base vector
 * @param delta - Delta to add (can be partial)
 * @returns Result vector with all values clamped to 0-1
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
        if (exports.EMOTIONAL_DIMENSIONS.includes(dim) && delta[dim] !== undefined) {
            result[dim] = Math.max(0, Math.min(1, ((result[dim] ?? 0.5) + (delta[dim] ?? 0))));
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
 * @returns Neutral vector (all 0.5)
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
 * Clamps out-of-range values to valid range.
 * Used as safety net after mathematical operations.
 *
 * @param vector - Vector to normalize
 * @returns Normalized vector with all values in 0-1 range
 */
function normalizeVector(vector) {
    const result = { ...vector };
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
        result[dim] = Math.max(0, Math.min(1, result[dim]));
    }
    return result;
}
/**
 * Get average of multiple vectors (element-wise average)
 *
 * Primary use: computing user taste from multiple surveyed albums
 *
 * @param vectors - Array of vectors to average
 * @returns Average vector
 *
 * @throws {Error} If array is empty
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
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
        sums[dim] = 0;
    }
    // Sum all vectors
    for (const vector of vectors) {
        for (const dim of exports.EMOTIONAL_DIMENSIONS) {
            sums[dim] += vector[dim];
        }
    }
    // Average
    const result = { ...sums };
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
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
 * @param v1 - First vector
 * @param w1 - Weight for first vector (0-1)
 * @param v2 - Second vector
 * @param w2 - Weight for second vector (0-1)
 * @returns Blended vector
 *
 * @example
 * const userProfile = { valence: 0.6, ... };
 * const weatherContext = { valence: 0.3, ... };
 * const currentState = blendVectors(userProfile, 0.6, weatherContext, 0.4);
 * // User preference dominates, weather influences
 */
function blendVectors(v1, w1, v2, w2) {
    const result = createNeutralVector();
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
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
 * @param a - First vector
 * @param b - Second vector
 * @returns Distance per dimension
 *
 * @example
 * const distances = getPerDimensionDistances(userProfile, albumProfile);
 * console.log(distances);
 * // { valence: 0.1, arousal: 0.05, ..., groundedness: 0.2 }
 */
function getPerDimensionDistances(a, b) {
    const distances = {};
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
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
 * @param a - First vector
 * @param b - Second vector
 * @param topN - How many dimensions to return
 * @returns Most different dimensions with distances
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
 * @param vector - Vector to validate
 * @returns True if valid, false otherwise
 */
function isValidVector(vector) {
    for (const dim of exports.EMOTIONAL_DIMENSIONS) {
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
 * @param vector - Vector to serialize
 * @returns JSON string
 */
function vectorToJSON(vector) {
    return JSON.stringify(vector);
}
/**
 * Parse vector from JSON
 *
 * @param json - JSON string to parse
 * @returns Parsed vector
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
/**
 * Blend 4 signals with adaptive weighting (for embedding fusion)
 *
 * Used by signal-fusion service to combine:
 * - Emotional tags (highest priority)
 * - Genre priors (medium priority)
 * - Artist embeddings (stabilizing signal)
 * - Global prior (fallback)
 *
 * Only blends signals that are present (not null).
 *
 * @param signals - Array of [embedding, weight] pairs or nulls
 * @returns Blended embedding
 */
function blendSignals(signals) {
    const result = {};
    const dims = exports.EMOTIONAL_DIMENSIONS;
    for (const dim of dims) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const signal of signals) {
            if (signal.embedding && signal.weight > 0) {
                const val = signal.embedding[dim];
                if (val !== undefined) {
                    weightedSum += val * signal.weight;
                    totalWeight += signal.weight;
                }
            }
        }
        result[dim] = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    }
    return normalizeVector(result);
}
/**
 * Apply contrast sharpening to maximize emotional distinctiveness
 *
 * PURPOSE:
 * - Push ALL values away from neutral center
 * - Create maximally distinct emotional profiles
 * - Eliminate embedding collapse
 *
 * ALGORITHM:
 * - Values in [0.35, 0.65] range (neutral zone) pushed HARD toward extremes
 * - Values in [0.25, 0.75] range get mild push
 * - Only extremely polarized values stay unchanged
 *
 * @param embedding - Embedding to sharpen
 * @param strength - Sharpening strength (1.0 = no change, 1.8 = aggressive)
 * @returns Sharpened embedding with increased contrast
 *
 * @example
 * Input:  { valence: 0.48, arousal: 0.52, ... }
 * Output: { valence: 0.30, arousal: 0.70, ... }
 * (Values pushed far from center; creates HIGH contrast)
 */
function sharpenContrast(embedding, strength = 1.8) {
    const sharpened = {};
    const dims = exports.EMOTIONAL_DIMENSIONS;
    const NEUTRAL_ZONE_MIN = 0.35;
    const NEUTRAL_ZONE_MAX = 0.65;
    for (const dim of dims) {
        const val = embedding[dim] ?? 0.5;
        // Apply aggressive sharpening to all values in/near neutral zone
        if (val >= NEUTRAL_ZONE_MIN && val <= NEUTRAL_ZONE_MAX) {
            // Strong push: values in [0.35, 0.65] → far from center
            const deviation = val - 0.5;
            const sharpenedDeviation = deviation * strength;
            const sharpenedVal = 0.5 + sharpenedDeviation;
            sharpened[dim] = Math.max(0, Math.min(1, sharpenedVal));
        }
        else if (val > 0.25 && val < 0.75) {
            // Mild push for near-neutral values: [0.25-0.35] or [0.65-0.75]
            const deviation = val - 0.5;
            const sharpenedDeviation = deviation * 1.4; // 40% amplification
            const sharpenedVal = 0.5 + sharpenedDeviation;
            sharpened[dim] = Math.max(0, Math.min(1, sharpenedVal));
        }
        else {
            // Extremely polarized values: keep unchanged
            sharpened[dim] = val;
        }
    }
    return normalizeVector(sharpened);
}
//# sourceMappingURL=vector.js.map