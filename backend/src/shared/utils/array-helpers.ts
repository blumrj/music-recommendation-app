/**
 * ARRAY UTILITY HELPERS
 * 
 * Common array operations used across services.
 * Reduces duplication of validation patterns like:
 *   if (items.length === 0)
 *   if (items.length > 0)
 */

/**
 * Check if array is empty
 * @param arr Array to check
 * @returns true if empty
 */
export const isEmpty = (arr: any[]): boolean => {
  return !arr || arr.length === 0;
};

/**
 * Check if array has items
 * @param arr Array to check
 * @returns true if array has at least one item
 */
export const isNotEmpty = (arr: any[]): boolean => {
  return arr && arr.length > 0;
};

/**
 * Get first item or undefined
 * @param arr Array to search
 * @returns First item or undefined
 */
export const first = <T>(arr: T[]): T | undefined => {
  return isNotEmpty(arr) ? arr[0] : undefined;
};

/**
 * Get last item or undefined
 * @param arr Array to search
 * @returns Last item or undefined
 */
export const last = <T>(arr: T[]): T | undefined => {
  return isNotEmpty(arr) ? arr[arr.length - 1] : undefined;
};

/**
 * Split array into chunks of specified size
 * @param arr Array to chunk
 * @param size Size of each chunk
 * @returns Array of chunks
 */
export const chunk = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Get unique items from array (by identity or custom key)
 * @param arr Array to deduplicate
 * @param keyFn Optional: function to extract unique key
 * @returns Array with unique items
 */
export const unique = <T>(arr: T[], keyFn?: (item: T) => any): T[] => {
  if (!keyFn) {
    return Array.from(new Set(arr));
  }
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Filter out falsy values from array
 * @param arr Array to filter
 * @returns Array with truthy values only
 */
export const compact = <T>(arr: (T | null | undefined)[]): T[] => {
  return arr.filter(Boolean) as T[];
};

/**
 * Find item and return undefined (not error) if not found
 * @param arr Array to search
 * @param predicate Function to test items
 * @returns Item or undefined
 */
export const findOrUndefined = <T>(arr: T[], predicate: (item: T) => boolean): T | undefined => {
  const result = arr.find(predicate);
  return result ?? undefined;
};

/**
 * Sum numeric array
 * @param arr Array of numbers
 * @returns Sum
 */
export const sum = (arr: number[]): number => {
  return arr.reduce((a, b) => a + b, 0);
};

/**
 * Average numeric array
 * @param arr Array of numbers
 * @returns Average or 0 if empty
 */
export const average = (arr: number[]): number => {
  return isEmpty(arr) ? 0 : sum(arr) / arr.length;
};
