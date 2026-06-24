"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    /**
     * Log info level message
     * @param prefix - Module/context prefix (e.g., "EMBEDDING", "PHASE4-S2")
     * @param message - Message to log
     */
    info: (prefix, message) => {
        console.log(`[${prefix}] ${message}`);
    },
    /**
     * Log error level message
     * @param prefix - Module/context prefix
     * @param message - Error message
     */
    error: (prefix, message) => {
        console.error(`[${prefix}] ❌ ${message}`);
    },
    /**
     * Log warning level message
     * @param prefix - Module/context prefix
     * @param message - Warning message
     */
    warn: (prefix, message) => {
        console.warn(`[${prefix}] ⚠️  ${message}`);
    },
    /**
     * Log debug level message (disabled by default in production)
     * @param prefix - Module/context prefix
     * @param message - Debug message
     */
    debug: (prefix, message) => {
        // Uncomment in development:
        // console.debug(`[${prefix}] 🐛 ${message}`);
    },
    /**
     * Log with JSON formatting (for complex objects)
     * @param prefix - Module/context prefix
     * @param message - Message
     * @param data - Object to pretty-print
     */
    withData: (prefix, message, data) => {
        console.log(`[${prefix}] ${message}`);
        console.log(JSON.stringify(data, null, 2));
    }
};
//# sourceMappingURL=logger.js.map