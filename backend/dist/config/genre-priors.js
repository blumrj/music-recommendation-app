"use strict";
/**
 * GENRE PRIORS CONFIGURATION
 *
 * Defines emotional deviations for music genres to prevent embedding collapse.
 *
 * PRINCIPLES:
 * - All deviations in [-0.45, +0.45] range (INCREASED from [-0.3, +0.3])
 * - Stronger emotional imprints prevent oversmoothing
 * - Each genre strongly influences only its key dimensions
 * - Based on musical characteristics and cultural associations
 *
 * RATIONALE FOR INCREASED RANGE:
 * - Prevents all embeddings from clustering around 0.5
 * - Genre signal must have meaningful emotional weight
 * - Encourages sparse/directional influence per dimension
 *
 * @category Configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.genrePriors = void 0;
exports.getGenrePrior = getGenrePrior;
exports.getAllGenres = getAllGenres;
exports.hasGenrePrior = hasGenrePrior;
exports.genrePriors = {
    // ROCK VARIANTS
    "indie rock": {
        warmth: +0.15,
        density: +0.15,
        confidence: 0.40
    },
    "post-punk": {
        tension: +0.40,
        warmth: -0.35,
        arousal: +0.25,
        confidence: 0.45
    },
    "alternative rock": {
        arousal: +0.20,
        tension: +0.15,
        confidence: 0.40
    },
    "psychedelic rock": {
        groundedness: -0.30,
        density: +0.20,
        confidence: 0.42
    },
    "progressive rock": {
        density: +0.30,
        confidence: 0.42
    },
    "art rock": {
        density: +0.30,
        confidence: 0.40
    },
    // METAL
    "metal": {
        arousal: +0.40,
        tension: +0.40,
        warmth: -0.30,
        confidence: 0.45
    },
    "heavy metal": {
        arousal: +0.40,
        tension: +0.35,
        warmth: -0.20,
        confidence: 0.42
    },
    "black metal": {
        tension: +0.45,
        arousal: +0.25,
        warmth: -0.40,
        confidence: 0.48
    },
    "death metal": {
        tension: +0.40,
        arousal: +0.35,
        warmth: -0.35,
        confidence: 0.45
    },
    "doom metal": {
        tension: +0.40,
        arousal: -0.35,
        warmth: -0.30,
        groundedness: +0.20,
        confidence: 0.45
    },
    // POP
    "pop": {
        valence: +0.25,
        arousal: +0.20,
        warmth: +0.20,
        confidence: 0.38
    },
    "synth-pop": {
        arousal: +0.30,
        confidence: 0.40
    },
    "indie pop": {
        valence: +0.20,
        intimacy: +0.20,
        confidence: 0.38
    },
    // ELECTRONIC & DANCE
    "electronic": {
        arousal: +0.10,
        confidence: 0.40
    },
    "techno": {
        arousal: +0.35,
        confidence: 0.42
    },
    "house": {
        arousal: +0.35,
        confidence: 0.42
    },
    "ambient": {
        arousal: -0.45,
        density: -0.40,
        groundedness: -0.25,
        confidence: 0.45
    },
    "ambient house": {
        arousal: -0.30,
        density: -0.25,
        confidence: 0.43
    },
    "drum and bass": {
        arousal: +0.40,
        tension: +0.20,
        confidence: 0.42
    },
    "dubstep": {
        arousal: +0.35,
        tension: +0.30,
        confidence: 0.40
    },
    // HIP-HOP & RAP
    "hip-hop": {
        arousal: +0.25,
        density: +0.20,
        confidence: 0.40
    },
    "trap": {
        arousal: +0.35,
        tension: +0.20,
        confidence: 0.40
    },
    "lo-fi hip-hop": {
        arousal: -0.30,
        warmth: +0.20,
        confidence: 0.42
    },
    // R&B & SOUL
    "r&b": {
        warmth: +0.30,
        intimacy: +0.30,
        arousal: +0.15,
        confidence: 0.42
    },
    "neo-soul": {
        warmth: +0.35,
        intimacy: +0.30,
        confidence: 0.45
    },
    "soul": {
        warmth: +0.35,
        intimacy: +0.35,
        valence: -0.15,
        confidence: 0.45
    },
    "funk": {
        arousal: +0.35,
        warmth: +0.20,
        confidence: 0.42
    },
    // JAZZ & BLUES
    "jazz": {
        warmth: +0.30,
        density: +0.20,
        confidence: 0.42
    },
    "blues": {
        warmth: +0.20,
        valence: -0.30,
        confidence: 0.42
    },
    // CLASSICAL & ORCHESTRAL
    "classical": {
        density: +0.30,
        confidence: 0.40
    },
    "orchestral": {
        density: +0.35,
        valence: +0.20,
        confidence: 0.42
    },
    "chamber music": {
        intimacy: +0.35,
        warmth: +0.30,
        confidence: 0.43
    },
    // FOLK & ROOTS
    "folk": {
        groundedness: +0.35,
        warmth: +0.20,
        confidence: 0.43
    },
    "indie folk": {
        groundedness: +0.30,
        intimacy: +0.20,
        confidence: 0.42
    },
    "country": {
        groundedness: +0.30,
        warmth: +0.20,
        confidence: 0.42
    },
    "reggae": {
        arousal: -0.20,
        warmth: +0.30,
        groundedness: +0.20,
        confidence: 0.42
    },
    // ALTERNATIVE & EXPERIMENTAL
    "experimental": {
        tension: +0.25,
        confidence: 0.35
    },
    "noise": {
        tension: +0.45,
        arousal: +0.30,
        warmth: -0.40,
        confidence: 0.40
    },
    "glitch": {
        tension: +0.30,
        confidence: 0.38
    },
    "shoegaze": {
        density: +0.30,
        groundedness: -0.30,
        confidence: 0.42
    },
    "darkwave": {
        tension: +0.30,
        warmth: -0.30,
        confidence: 0.40
    },
    "gothic rock": {
        tension: +0.25,
        valence: -0.30,
        warmth: -0.25,
        confidence: 0.40
    },
    "grunge": {
        tension: +0.25,
        valence: -0.30,
        arousal: +0.20,
        warmth: -0.25,
        confidence: 0.40
    },
    "post-rock": {
        density: +0.25,
        confidence: 0.42
    },
    "synthwave": {
        arousal: +0.25,
        confidence: 0.42
    },
    "vaporwave": {
        arousal: -0.25,
        confidence: 0.42
    },
    "lo-fi": {
        arousal: -0.30,
        density: -0.25,
        confidence: 0.40
    }
};
/**
 * Get genre prior by name (case-insensitive)
 *
 * @param genreName - Genre name (e.g., "indie rock")
 * @returns Genre prior or null if not found
 */
function getGenrePrior(genreName) {
    const normalized = genreName.toLowerCase().trim();
    return exports.genrePriors[normalized] ?? null;
}
/**
 * Get all available genres
 */
function getAllGenres() {
    return Object.keys(exports.genrePriors).sort();
}
/**
 * Check if genre has prior defined
 */
function hasGenrePrior(genreName) {
    const normalized = genreName.toLowerCase().trim();
    return normalized in exports.genrePriors;
}
//# sourceMappingURL=genre-priors.js.map