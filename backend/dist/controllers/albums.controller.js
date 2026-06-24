"use strict";
/**
 * Album Controller
 *
 * Handles HTTP requests for album surveys.
 * Delegates business logic to surveyService.
 *
 * ARCHITECTURE:
 * - Controller: Handles HTTP parsing, validation, and response formatting
 * - Service: Handles database operations and business logic
 *
 * @category Controllers
 * @module controllers/albums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.albumController = exports.AlbumController = void 0;
/**
 * Album Controller
 *
 * Handles all album-related HTTP requests.
 * All methods are async and assume authMiddleware has already validated JWT.
 *
 * @class AlbumController
 */
class AlbumController {
}
exports.AlbumController = AlbumController;
/**
 * Album Controller instance
 * Singleton instance for use in routes
 *
 * @type {AlbumController}
 */
exports.albumController = new AlbumController();
//# sourceMappingURL=albums.controller.js.map