"use strict";
/**
 * ARRAY UTILITY HELPERS
 *
 * Common array operations used across services.
 * Reduces duplication of validation patterns like:
 *   if (items.length === 0)
 *   if (items.length > 0)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.average = exports.sum = exports.findOrUndefined = exports.compact = exports.unique = exports.chunk = exports.last = exports.first = exports.isNotEmpty = exports.isEmpty = void 0;
/**
 * Check if array is empty
 * @param arr Array to check
 * @returns true if empty
 */
const isEmpty = (arr) => {
    return !arr || arr.length === 0;
};
exports.isEmpty = isEmpty;
/**
 * Check if array has items
 * @param arr Array to check
 * @returns true if array has at least one item
 */
const isNotEmpty = (arr) => {
    return arr && arr.length > 0;
};
exports.isNotEmpty = isNotEmpty;
/**
 * Get first item or undefined
 * @param arr Array to search
 * @returns First item or undefined
 */
const first = (arr) => {
    return (0, exports.isNotEmpty)(arr) ? arr[0] : undefined;
};
exports.first = first;
/**
 * Get last item or undefined
 * @param arr Array to search
 * @returns Last item or undefined
 */
const last = (arr) => {
    return (0, exports.isNotEmpty)(arr) ? arr[arr.length - 1] : undefined;
};
exports.last = last;
/**
 * Split array into chunks of specified size
 * @param arr Array to chunk
 * @param size Size of each chunk
 * @returns Array of chunks
 */
const chunk = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};
exports.chunk = chunk;
/**
 * Get unique items from array (by identity or custom key)
 * @param arr Array to deduplicate
 * @param keyFn Optional: function to extract unique key
 * @returns Array with unique items
 */
const unique = (arr, keyFn) => {
    if (!keyFn) {
        return Array.from(new Set(arr));
    }
    const seen = new Set();
    return arr.filter(item => {
        const key = keyFn(item);
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
exports.unique = unique;
/**
 * Filter out falsy values from array
 * @param arr Array to filter
 * @returns Array with truthy values only
 */
const compact = (arr) => {
    return arr.filter(Boolean);
};
exports.compact = compact;
/**
 * Find item and return undefined (not error) if not found
 * @param arr Array to search
 * @param predicate Function to test items
 * @returns Item or undefined
 */
const findOrUndefined = (arr, predicate) => {
    const result = arr.find(predicate);
    return result ?? undefined;
};
exports.findOrUndefined = findOrUndefined;
/**
 * Sum numeric array
 * @param arr Array of numbers
 * @returns Sum
 */
const sum = (arr) => {
    return arr.reduce((a, b) => a + b, 0);
};
exports.sum = sum;
/**
 * Average numeric array
 * @param arr Array of numbers
 * @returns Average or 0 if empty
 */
const average = (arr) => {
    return (0, exports.isEmpty)(arr) ? 0 : (0, exports.sum)(arr) / arr.length;
};
exports.average = average;
//# sourceMappingURL=array-helpers.js.map