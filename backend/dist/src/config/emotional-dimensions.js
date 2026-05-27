"use strict";
/**
 * EMOTIONAL DIMENSIONS CONFIGURATION
 *
 * Re-exports from shared configuration.
 * This file ensures backward compatibility while maintaining a single source of truth
 * in the shared config.
 *
 * @category Configuration
 * @see @shared/config/emotional-dimensions for the authoritative definition
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDimension = exports.getDimensions = exports.getDimensionNames = exports.EMOTIONAL_DIMENSIONS = void 0;
var emotional_dimensions_1 = require("@shared/config/emotional-dimensions");
Object.defineProperty(exports, "EMOTIONAL_DIMENSIONS", { enumerable: true, get: function () { return emotional_dimensions_1.EMOTIONAL_DIMENSIONS; } });
Object.defineProperty(exports, "getDimensionNames", { enumerable: true, get: function () { return emotional_dimensions_1.getDimensionNames; } });
Object.defineProperty(exports, "getDimensions", { enumerable: true, get: function () { return emotional_dimensions_1.getDimensions; } });
Object.defineProperty(exports, "getDimension", { enumerable: true, get: function () { return emotional_dimensions_1.getDimension; } });
