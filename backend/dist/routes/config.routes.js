"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configRouter = void 0;
const express_1 = require("express");
const emotional_dimensions_1 = require("../config/emotional-dimensions");
exports.configRouter = (0, express_1.Router)();
/**
 * GET /api/config/emotional-dimensions
 * Returns the emotional dimensions configuration used by the application
 */
exports.configRouter.get('/emotional-dimensions', (req, res) => {
    try {
        const dimensions = (0, emotional_dimensions_1.getDimensions)();
        res.json(dimensions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve emotional dimensions' });
    }
});
