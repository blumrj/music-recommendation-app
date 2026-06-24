"use strict";
/**
 * VALIDATION UTILITY HELPERS
 *
 * Common validation patterns used across services.
 * Provides safe checks for common scenarios.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.almostEqual = exports.isValidEmail = exports.safeParse = exports.normalize = exports.clamp = exports.hasRequiredKeys = exports.isNormalized = exports.isPositive = exports.isValidString = exports.isDefined_safe = exports.isDefined = void 0;
/**
 * Check if value is defined and not null
 * @param value Value to check
 * @returns true if value is defined and not null
 */
const isDefined = (value) => {
    return value !== undefined && value !== null;
};
exports.isDefined = isDefined;
/**
 * Check if value is empty (undefined, null, empty string, empty array)
 * @param value Value to check
 * @returns true if empty
 */
const isDefined_safe = (value) => {
    return value !== undefined && value !== null;
};
exports.isDefined_safe = isDefined_safe;
/**
 * Validate string is not empty
 * @param str String to validate
 * @returns true if string has content
 */
const isValidString = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
};
exports.isValidString = isValidString;
/**
 * Validate number is positive
 * @param num Number to validate
 * @returns true if number is positive
 */
const isPositive = (num) => {
    return typeof num === 'number' && num > 0;
};
exports.isPositive = isPositive;
/**
 * Validate number is in range [0, 1]
 * @param num Number to validate
 * @returns true if number is in 0-1 range
 */
const isNormalized = (num) => {
    return typeof num === 'number' && num >= 0 && num <= 1;
};
exports.isNormalized = isNormalized;
/**
 * Validate object has required properties
 * @param obj Object to validate
 * @param requiredKeys Keys that must exist
 * @returns true if all required keys present and non-null
 */
const hasRequiredKeys = (obj, requiredKeys) => {
    if (!obj || typeof obj !== 'object')
        return false;
    return requiredKeys.every(key => (0, exports.isDefined)(obj[key]));
};
exports.hasRequiredKeys = hasRequiredKeys;
/**
 * Clamp value between min and max
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
const clamp = (value, min, max) => {
    return Math.max(min, Math.min(max, value));
};
exports.clamp = clamp;
/**
 * Normalize value from range [min, max] to [0, 1]
 * @param value Value to normalize
 * @param min Minimum of range
 * @param max Maximum of range
 * @returns Normalized value [0, 1]
 */
const normalize = (value, min, max) => {
    if (max <= min)
        return 0;
    return (0, exports.clamp)((value - min) / (max - min), 0, 1);
};
exports.normalize = normalize;
/**
 * Safe JSON parse with fallback
 * @param json JSON string to parse
 * @param fallback Value if parsing fails
 * @returns Parsed object or fallback
 */
const safeParse = (json, fallback) => {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback ?? null;
    }
};
exports.safeParse = safeParse;
/**
 * Validate email format (basic)
 * @param email Email to validate
 * @returns true if email looks valid
 */
const isValidEmail = (email) => {
    if (!(0, exports.isValidString)(email))
        return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
/**
 * Compare two values with tolerance (for floats)
 * @param a First value
 * @param b Second value
 * @param tolerance Tolerance for comparison (default 0.0001)
 * @returns true if values are equal within tolerance
 */
const almostEqual = (a, b, tolerance = 0.0001) => {
    return Math.abs(a - b) < tolerance;
};
exports.almostEqual = almostEqual;
//# sourceMappingURL=validation-helpers.js.map