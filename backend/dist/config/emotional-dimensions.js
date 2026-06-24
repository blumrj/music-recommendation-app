"use strict";
/**
 * EMOTIONAL DIMENSIONS CONFIGURATION
 *
 * Defines the core emotional dimensions that form our embedding space.
 * These dimension names are used as semantic anchors for FastText similarity.
 *
 * PRINCIPLE: Only dimension NAMES are defined here.
 * The meanings are derived via FastText semantic similarity to Last.fm tags,
 * with sparsification to keep only top 1-2 most relevant dimensions per tag.
 *
 * @category Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMOTIONAL_DIMENSIONS = void 0;
exports.getDimensionNames = getDimensionNames;
exports.getDimensions = getDimensions;
exports.getDimension = getDimension;
/**
 * multi-dimensional emotional anchor space
 *
 * Each dimension can be queried for semantic similarity to music tags.
 * Example: similarity(tag="ethereal", dimension="groundedness")
 */
exports.EMOTIONAL_DIMENSIONS = {
    valence: {
        name: "valence",
        description: "Sad, melancholic, gloomy (0) vs uplifting, joyful, positive (1)",
        label: "Positivity",
        leftLabel: "Sad",
        rightLabel: "Happy"
    },
    arousal: {
        name: "arousal",
        description: "Calm, soothing, relaxing (0) vs energetic, stimulating, exciting (1)",
        label: "Energy",
        leftLabel: "Calm",
        rightLabel: "Energized"
    },
    tension: {
        name: "tension",
        description: "Relaxed, resolved, consonant (0) vs tense, dissonant, unsettling (1)",
        label: "Tension",
        leftLabel: "Relaxed",
        rightLabel: "Tense"
    },
    warmth: {
        name: "warmth",
        description: "Cold, distant, harsh (0) vs warm, intimate, cozy (1)",
        label: "Warmth",
        leftLabel: "Cold",
        rightLabel: "Warm"
    },
    intimacy: {
        name: "intimacy",
        description: "Distant, external, public (0) vs personal, introspective, vulnerable (1)",
        label: "Intimacy",
        leftLabel: "Distant",
        rightLabel: "Personal"
    },
    density: {
        name: "density",
        description: "Minimal, sparse, simple (0) vs layered, rich, complex (1)",
        label: "Density",
        leftLabel: "Sparse",
        rightLabel: "Rich"
    },
    groundedness: {
        name: "groundedness",
        description: "Dreamy, ethereal, escapist (0) vs grounded, earthy, rooted (1)",
        label: "Groundedness",
        leftLabel: "Dreamy",
        rightLabel: "Grounded"
    }
};
/**
 * Get all dimension names for semantic embeddings
 * @returns Array of dimensions names
 */
function getDimensionNames() {
    return Object.keys(exports.EMOTIONAL_DIMENSIONS);
}
/**
 * Get all dimensions as array (for iteration)
 * @returns Array of dimension objects
 */
function getDimensions() {
    return Object.values(exports.EMOTIONAL_DIMENSIONS);
}
/**
 * Get dimension by name
 * @param name - Dimension name
 * @returns Dimension object or undefined
 */
function getDimension(name) {
    return exports.EMOTIONAL_DIMENSIONS[name];
}
//# sourceMappingURL=emotional-dimensions.js.map