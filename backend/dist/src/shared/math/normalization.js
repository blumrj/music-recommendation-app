"use strict";
/**
 * NORMALIZATION & CONSTRAINT OPERATIONS
 *
 * Specialized normalization for context modifiers and other constrained operations.
 *
 * Context modifiers are PARTIAL vectors that influence emotional state but
 * within a constrained range [-0.3, +0.3] per dimension.
 *
 * @category Shared Math
 * @module shared/math/normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeModifier = normalizeModifier;
exports.addModifiers = addModifiers;
exports.clampVector = clampVector;
exports.normalizeToUnitLength = normalizeToUnitLength;
exports.minMaxNormalize = minMaxNormalize;
exports.zScoreNormalize = zScoreNormalize;
exports.sigmoidNormalize = sigmoidNormalize;
exports.robustNormalize = robustNormalize;
/**
 * Normalize context modifier to valid range
 *
 * Context modifiers work in [-0.3, +0.3] range per dimension.
 * This ensures they're soft influences, not complete overrides.
 *
 * Clamps each dimension to this range.
 *
 * @param modifier - Modifier to normalize
 * @returns Normalized modifier with all dims in [-0.3, +0.3]
 *
 * @example
 * const mod = { warmth: 0.5, arousal: -0.8 };  // Out of range
 * const normalized = normalizeModifier(mod);
 * // Result: { warmth: 0.3, arousal: -0.3 }
 */
function normalizeModifier(modifier) {
    const result = {};
    for (const key in modifier) {
        if (key === "confidence") {
            // Don't normalize confidence
            result.confidence = modifier.confidence;
            continue;
        }
        const dimKey = key;
        const val = modifier[dimKey];
        // Clamp to [-0.3, +0.3]
        if (typeof val === "number") {
            result[dimKey] = Math.max(-0.3, Math.min(0.3, val));
        }
    }
    return result;
}
/**
 * Add two context modifiers together
 *
 * Used to combine modifiers from different factors (temperature, rain, time of day, etc.)
 *
 * - Sums the values for each dimension
 * - Skips "confidence" field
 * - Result should be normalized afterward
 *
 * @param a - First modifier
 * @param b - Second modifier
 * @returns Sum of modifiers (may be out of range, should normalize)
 *
 * @example
 * const tempMod = { warmth: 0.15, arousal: -0.05 };
 * const rainMod = { intimacy: 0.20 };
 * const combined = addModifiers(tempMod, rainMod);
 * // Result: { warmth: 0.15, arousal: -0.05, intimacy: 0.20 }
 */
function addModifiers(a, b) {
    const result = { ...a };
    Object.keys(b).forEach((key) => {
        if (key === "confidence")
            return; // skip confidence field
        const aVal = result[key] ?? 0;
        const bVal = b[key] ?? 0;
        result[key] = aVal + bVal;
    });
    return result;
}
/**
 * Clamp all values in a vector/modifier to a specific range
 *
 * Generic clamping for any vector-like object.
 *
 * @param vector - Vector to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped vector
 *
 * @example
 * const emotionalVector = { valence: 1.2, arousal: -0.5, ... };
 * const clamped = clampVector(emotionalVector, 0, 1);
 * // Result: { valence: 1.0, arousal: 0.0, ... }
 */
function clampVector(vector, min, max) {
    const result = {};
    for (const [key, value] of Object.entries(vector)) {
        if (typeof value === "number") {
            result[key] = Math.max(min, Math.min(max, value));
        }
    }
    return result;
}
/**
 * Normalize vector to unit length (L2 normalization)
 *
 * Scales vector so that magnitude = 1.
 * Different from elementwise normalization.
 *
 * Used for: embedding standardization, ML preprocessing
 *
 * @param vector - Vector to normalize
 * @returns Unit-length vector
 */
function normalizeToUnitLength(vector) {
    let magnitude = 0;
    for (const val of vector) {
        magnitude += val * val;
    }
    magnitude = Math.sqrt(magnitude);
    if (magnitude === 0) {
        return vector; // Zero vector, can't normalize
    }
    return vector.map((val) => val / magnitude);
}
/**
 * Min-max normalize a number to 0-1 range
 *
 * @param value - Value to normalize
 * @param min - Minimum of original range
 * @param max - Maximum of original range
 * @returns Normalized value in 0-1
 *
 * @example
 * const temp = 25;  // In range -60 to +60
 * const normalized = minMaxNormalize(temp, -60, 60);
 * // Result: 0.708 (normalized to 0-1)
 */
function minMaxNormalize(value, min, max) {
    if (max === min)
        return 0.5; // Avoid division by zero
    return (value - min) / (max - min);
}
/**
 * Z-score normalize a value
 *
 * (value - mean) / std_dev
 *
 * @param value - Value to normalize
 * @param mean - Mean of distribution
 * @param stdDev - Standard deviation
 * @returns Z-score
 */
function zScoreNormalize(value, mean, stdDev) {
    if (stdDev === 0)
        return 0;
    return (value - mean) / stdDev;
}
/**
 * Sigmoid normalization (S-curve)
 *
 * Smooth S-curve that maps any value to 0-1.
 * Steepness = how quickly it transitions.
 *
 * @param value - Value to normalize
 * @param midpoint - Value that maps to 0.5
 * @param steepness - Curve steepness (higher = sharper transition)
 * @returns Value in 0-1
 *
 * @example
 * const temp = 15;  // Middle value
 * const normalized = sigmoidNormalize(temp, 0, 0.1);
 * // Result: ~0.5 (middle of curve)
 */
function sigmoidNormalize(value, midpoint, steepness) {
    return 1 / (1 + Math.exp(-steepness * (value - midpoint)));
}
/**
 * Robust normalization (using median & IQR)
 *
 * More robust to outliers than Z-score.
 *
 * @param value - Value to normalize
 * @param median - Median of distribution
 * @param iqr - Interquartile range
 * @returns Normalized value
 */
function robustNormalize(value, median, iqr) {
    if (iqr === 0)
        return 0;
    return (value - median) / iqr;
}
