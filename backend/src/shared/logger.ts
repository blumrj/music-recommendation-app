/**
 * CENTRALIZED LOGGER SERVICE
 * 
 * Provides consistent logging across the application.
 * Replaces scattered console.log statements with a unified interface.
 * 
 * Usage:
 *   logger.info("MODULE", "Message");
 *   logger.error("MODULE", "Error message");
 *   logger.warn("MODULE", "Warning message");
 *   logger.debug("MODULE", "Debug info");
 * 
 * Output format: [MODULE] Message
 */

export const logger = {
  /**
   * Log info level message
   * @param prefix - Module/context prefix (e.g., "EMBEDDING", "PHASE4-S2")
   * @param message - Message to log
   */
  info: (prefix: string, message: string) => {
    console.log(`[${prefix}] ${message}`);
  },

  /**
   * Log error level message
   * @param prefix - Module/context prefix
   * @param message - Error message
   */
  error: (prefix: string, message: string) => {
    console.error(`[${prefix}] ❌ ${message}`);
  },

  /**
   * Log warning level message
   * @param prefix - Module/context prefix
   * @param message - Warning message
   */
  warn: (prefix: string, message: string) => {
    console.warn(`[${prefix}] ⚠️  ${message}`);
  },

  /**
   * Log debug level message (disabled by default in production)
   * @param prefix - Module/context prefix
   * @param message - Debug message
   */
  debug: (prefix: string, message: string) => {
    // Uncomment in development:
    // console.debug(`[${prefix}] 🐛 ${message}`);
  },

  /**
   * Log with JSON formatting (for complex objects)
   * @param prefix - Module/context prefix
   * @param message - Message
   * @param data - Object to pretty-print
   */
  withData: (prefix: string, message: string, data: any) => {
    console.log(`[${prefix}] ${message}`);
    console.log(JSON.stringify(data, null, 2));
  }
};
