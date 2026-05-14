/**
 * EMOTIONAL DIMENSIONS CONFIGURATION
 * 
 * Defines the 7 core emotional dimensions that form our embedding space.
 * These dimension names are used as semantic anchors for FastText similarity.
 * 
 * PRINCIPLE: Only dimension NAMES are defined here.
 * The meanings are derived via FastText semantic similarity to Last.fm tags,
 * with sparsification to keep only top 1-2 most relevant dimensions per tag.
 * 
 * @category Configuration
 */

export interface EmotionalDimension {
  name: string;
  description: string;
}

/**
 * 7-dimensional emotional anchor space
 * 
 * Each dimension can be queried for semantic similarity to music tags.
 * Example: similarity(tag="ethereal", dimension="groundedness")
 */
export const EMOTIONAL_DIMENSIONS: Record<string, EmotionalDimension> = {
  valence: {
    name: "valence",
    description: "Sad, melancholic, gloomy (0) vs uplifting, joyful, positive (1)"
  },
  arousal: {
    name: "arousal",
    description: "Calm, soothing, relaxing (0) vs energetic, stimulating, exciting (1)"
  },
  tension: {
    name: "tension",
    description: "Relaxed, resolved, consonant (0) vs tense, dissonant, unsettling (1)"
  },
  warmth: {
    name: "warmth",
    description: "Cold, distant, harsh (0) vs warm, intimate, cozy (1)"
  },
  intimacy: {
    name: "intimacy",
    description: "Distant, external, public (0) vs personal, introspective, vulnerable (1)"
  },
  density: {
    name: "density",
    description: "Minimal, sparse, simple (0) vs layered, rich, complex (1)"
  },
  groundedness: {
    name: "groundedness",
    description: "Dreamy, ethereal, escapist (0) vs grounded, earthy, rooted (1)"
  }
};

/**
 * Get all dimension names for semantic embeddings
 * @returns Array of 7 dimension names
 */
export function getDimensionNames(): string[] {
  return Object.keys(EMOTIONAL_DIMENSIONS);
}

/**
 * Get all dimensions as array (for iteration)
 * @returns Array of dimension objects
 */
export function getDimensions(): EmotionalDimension[] {
  return Object.values(EMOTIONAL_DIMENSIONS);
}

/**
 * Get dimension by name
 * @param name - Dimension name
 * @returns Dimension object or undefined
 */
export function getDimension(name: string): EmotionalDimension | undefined {
  return EMOTIONAL_DIMENSIONS[name];
}
