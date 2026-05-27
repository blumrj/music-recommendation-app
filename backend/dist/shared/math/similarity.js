"use strict";
/**
 * SIMILARITY & DISTANCE METRICS
 *
 * Advanced similarity calculations for different embedding spaces:
 * - 7D emotional space (cosine similarity)
 * - 300D word embedding space (generic similarity)
 * - Dimension-level similarities
 *
 * Single source of truth for all similarity operations.
 *
 * @category Shared Math
 * @module shared/math/similarity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jaccardSimilarity = jaccardSimilarity;
exports.levenshteinDistance = levenshteinDistance;
exports.stringSimilarity = stringSimilarity;
exports.cosineSimilarity = cosineSimilarity;
exports.pearsonCorrelation = pearsonCorrelation;
exports.manhattanDistance = manhattanDistance;
exports.chebyshevDistance = chebyshevDistance;
exports.dimensionSimilarities = dimensionSimilarities;
exports.harmonicMean = harmonicMean;
exports.maxPooling = maxPooling;
exports.averagePooling = averagePooling;
const vector_1 = require("./vector");
/**
 * Compute Jaccard similarity between two sets
 *
 * Measures overlap: |A ∩ B| / |A ∪ B|
 *
 * Used for tag similarity, genre overlap, etc.
 *
 * @param setA - First set of items
 * @param setB - Second set of items
 * @returns Jaccard similarity 0-1
 *
 * @example
 * const tags1 = ["sad", "introspective", "dark"];
 * const tags2 = ["sad", "melancholic", "piano"];
 * const similarity = jaccardSimilarity(tags1, tags2);
 * // Result: 0.2 (only "sad" is shared)
 */
function jaccardSimilarity(setA, setB) {
    const setAItems = new Set(setA);
    const setBItems = new Set(setB);
    let intersection = 0;
    // Use Array.from to iterate over Set for compatibility
    const aArray = Array.from(setAItems);
    for (const item of aArray) {
        if (setBItems.has(item)) {
            intersection++;
        }
    }
    const union = setAItems.size + setBItems.size - intersection;
    if (union === 0)
        return 1; // Both empty
    return intersection / union;
}
/**
 * Compute Levenshtein distance between two strings
 *
 * Measures edit distance: minimum edits needed to transform one string to another.
 *
 * Used for fuzzy tag matching, typo tolerance.
 *
 * @param s1 - First string
 * @param s2 - Second string
 * @returns Edit distance (lower = more similar)
 *
 * @example
 * const distance = levenshteinDistance("melancholic", "melancholic");
 * // Result: 0 (identical)
 *
 * const distance2 = levenshteinDistance("melancholic", "melancholy");
 * // Result: 2 (2 character substitutions)
 */
function levenshteinDistance(s1, s2) {
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[s2.length][s1.length];
}
/**
 * Normalize Levenshtein distance to 0-1 similarity
 *
 * Converts absolute edit distance to normalized similarity.
 *
 * @param s1 - First string
 * @param s2 - Second string
 * @returns Similarity 0-1 where 1 = identical
 *
 * @example
 * const sim = stringSimilarity("melancholic", "melancholic");
 * // Result: 1.0
 */
function stringSimilarity(s1, s2) {
    const distance = levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0)
        return 1; // Both empty
    return 1 - distance / maxLen;
}
/**
 * Compute cosine similarity between two generic numeric vectors
 *
 * Wrapper around vector math for clarity in similarity module.
 * Works with any dimension (7D emotional, 300D word embeddings, etc.)
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector (must match length)
 * @returns Cosine similarity 0-1
 *
 * @throws {Error} If vectors have different lengths
 */
function cosineSimilarity(vec1, vec2) {
    return (0, vector_1.cosineSimilarityGeneric)(vec1, vec2);
}
/**
 * Compute Pearson correlation coefficient
 *
 * Measures linear relationship between two variables.
 * Used for measuring if two embeddings have similar variance patterns.
 *
 * @param values1 - First series of values
 * @param values2 - Second series of values (must match length)
 * @returns Correlation -1 to +1
 *
 * @throws {Error} If arrays have different lengths
 */
function pearsonCorrelation(values1, values2) {
    if (values1.length !== values2.length) {
        throw new Error("Arrays must have same length");
    }
    if (values1.length < 2) {
        throw new Error("Need at least 2 values");
    }
    // Calculate means
    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
    // Calculate deviations
    const dev1 = values1.map((v) => v - mean1);
    const dev2 = values2.map((v) => v - mean2);
    // Calculate covariance
    let covariance = 0;
    for (let i = 0; i < dev1.length; i++) {
        covariance += dev1[i] * dev2[i];
    }
    covariance /= dev1.length;
    // Calculate standard deviations
    const var1 = dev1.reduce((sum, v) => sum + v * v, 0) / dev1.length;
    const var2 = dev2.reduce((sum, v) => sum + v * v, 0) / dev2.length;
    const std1 = Math.sqrt(var1);
    const std2 = Math.sqrt(var2);
    if (std1 === 0 || std2 === 0) {
        return 0; // One series has no variance
    }
    return covariance / (std1 * std2);
}
/**
 * Compute Manhattan distance (taxicab/L1 distance)
 *
 * Sum of absolute differences: |a-b| + |c-d| + ...
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Manhattan distance
 */
function manhattanDistance(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("Vectors must have same length");
    }
    let distance = 0;
    for (let i = 0; i < vec1.length; i++) {
        distance += Math.abs(vec1[i] - vec2[i]);
    }
    return distance;
}
/**
 * Compute Chebyshev distance (Chessboard/L-infinity distance)
 *
 * Maximum absolute difference: max(|a-b|, |c-d|, ...)
 *
 * @param vec1 - First vector
 * @param vec2 - Second vector
 * @returns Chebyshev distance
 */
function chebyshevDistance(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error("Vectors must have same length");
    }
    let maxDiff = 0;
    for (let i = 0; i < vec1.length; i++) {
        maxDiff = Math.max(maxDiff, Math.abs(vec1[i] - vec2[i]));
    }
    return maxDiff;
}
/**
 * Compute dimension-by-dimension similarity between emotional vectors
 *
 * Useful for debugging: shows which dimensions match well and which don't.
 *
 * @param v1 - First emotional vector
 * @param v2 - Second emotional vector
 * @returns Per-dimension similarity scores
 *
 * @example
 * const v1 = { valence: 0.7, arousal: 0.5, ... };
 * const v2 = { valence: 0.6, arousal: 0.8, ... };
 * const sims = dimensionSimilarities(v1, v2);
 * // Result: { valence: 0.98, arousal: 0.75, ... }
 */
function dimensionSimilarities(v1, v2) {
    const result = {};
    for (const dim of vector_1.EMOTIONAL_DIMENSIONS) {
        const val1 = v1[dim];
        const val2 = v2[dim];
        const diff = Math.abs(val1 - val2);
        // Convert difference to similarity (1 - diff, where diff is clamped to 0-1)
        result[dim] = 1 - Math.min(1, diff);
    }
    return result;
}
/**
 * Compute harmonic mean of similarity scores
 *
 * Better for averaging similarity metrics than arithmetic mean.
 *
 * Formula: 2 * (sim1 * sim2) / (sim1 + sim2)
 *
 * @param similarities - Array of similarity scores
 * @returns Harmonic mean
 *
 * @example
 * const harmonic = harmonicMean([0.8, 0.9]);
 * // Result: 0.847 (between the values, closer to smaller one)
 */
function harmonicMean(similarities) {
    if (similarities.length === 0)
        return 0;
    if (similarities.includes(0))
        return 0;
    const sum = similarities.reduce((a, b) => a + b, 0);
    return similarities.length / (similarities.reduce((a, b) => a + 1 / b, 0));
}
/**
 * Compute max pooling over similarities
 *
 * Returns maximum similarity found.
 * Useful for "does this match ANY reference?"
 *
 * @param similarities - Array of similarities
 * @returns Maximum similarity
 */
function maxPooling(similarities) {
    return Math.max(...similarities);
}
/**
 * Compute average pooling over similarities
 *
 * Returns average similarity.
 *
 * @param similarities - Array of similarities
 * @returns Average similarity
 */
function averagePooling(similarities) {
    if (similarities.length === 0)
        return 0;
    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
}
