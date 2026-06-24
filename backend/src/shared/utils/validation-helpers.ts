/**
 * VALIDATION UTILITY HELPERS
 * 
 * Common validation patterns used across services.
 * Provides safe checks for common scenarios.
 */

/**
 * Check if value is defined and not null
 * @param value Value to check
 * @returns true if value is defined and not null
 */
export const isDefined = (value: any): boolean => {
  return value !== undefined && value !== null;
};

/**
 * Check if value is empty (undefined, null, empty string, empty array)
 * @param value Value to check
 * @returns true if empty
 */
export const isDefined_safe = (value: any): value is any => {
  return value !== undefined && value !== null;
};

/**
 * Validate string is not empty
 * @param str String to validate
 * @returns true if string has content
 */
export const isValidString = (str: any): str is string => {
  return typeof str === 'string' && str.trim().length > 0;
};

/**
 * Validate number is positive
 * @param num Number to validate
 * @returns true if number is positive
 */
export const isPositive = (num: any): num is number => {
  return typeof num === 'number' && num > 0;
};

/**
 * Validate number is in range [0, 1]
 * @param num Number to validate
 * @returns true if number is in 0-1 range
 */
export const isNormalized = (num: any): num is number => {
  return typeof num === 'number' && num >= 0 && num <= 1;
};

/**
 * Validate object has required properties
 * @param obj Object to validate
 * @param requiredKeys Keys that must exist
 * @returns true if all required keys present and non-null
 */
export const hasRequiredKeys = (obj: any, requiredKeys: string[]): boolean => {
  if (!obj || typeof obj !== 'object') return false;
  return requiredKeys.every(key => isDefined(obj[key]));
};

/**
 * Clamp value between min and max
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Normalize value from range [min, max] to [0, 1]
 * @param value Value to normalize
 * @param min Minimum of range
 * @param max Maximum of range
 * @returns Normalized value [0, 1]
 */
export const normalize = (value: number, min: number, max: number): number => {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
};

/**
 * Safe JSON parse with fallback
 * @param json JSON string to parse
 * @param fallback Value if parsing fails
 * @returns Parsed object or fallback
 */
export const safeParse = <T = any>(json: string, fallback?: T): T | null => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback ?? null;
  }
};

/**
 * Validate email format (basic)
 * @param email Email to validate
 * @returns true if email looks valid
 */
export const isValidEmail = (email: any): boolean => {
  if (!isValidString(email)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Compare two values with tolerance (for floats)
 * @param a First value
 * @param b Second value
 * @param tolerance Tolerance for comparison (default 0.0001)
 * @returns true if values are equal within tolerance
 */
export const almostEqual = (a: number, b: number, tolerance: number = 0.0001): boolean => {
  return Math.abs(a - b) < tolerance;
};
