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

export interface EmotionalDimension {
  name: string;
  description: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

/**
 * multi-dimensional emotional anchor space
 * 
 * Each dimension can be queried for semantic similarity to music tags.
 * Example: similarity(tag="ethereal", dimension="groundedness")
 */
export const EMOTIONAL_DIMENSIONS: Record<string, EmotionalDimension> = {
  valence: {
    name: "valence",
    description: "Does this album sit with you in the dark, or lift your spirits?",
    label: "Positivity",
    leftLabel: "Sad",
    rightLabel: "Happy"
  },
  arousal: {
    name: "arousal",
    description: "Does it make you want to move, or help you slow down and breathe?",
    label: "Energy",
    leftLabel: "Calm",
    rightLabel: "Energized"
  },
  tension: {
    name: "tension",
    description: "Does it sit comfortably, or keep you slightly on edge?",
    label: "Tension",
    leftLabel: "Relaxed",
    rightLabel: "Tense"
  },
  warmth: {
    name: "warmth",
    description: "Is it cool and distant, or warm and comforting?",
    label: "Warmth",
    leftLabel: "Cool",
    rightLabel: "Comforting"
  },
  intimacy: {
    name: "intimacy",
    description: "Does it feel distant, or deeply personal?",
    label: "Intimacy",
    leftLabel: "Distant",
    rightLabel: "Personal"
  },
  density: {
    name: "density",
    description: "Is it stripped back and bare, or layered with sound on sound?",
    label: "Density",
    leftLabel: "Sparse",
    rightLabel: "Rich"
  },
  groundedness: {
    name: "groundedness",
    description: "Does it feel rooted in the real world, or like floating away?",
    label: "Groundedness",
    leftLabel: "Dreamy",
    rightLabel: "Grounded"
  }
};

/**
 * Get all dimension names for semantic embeddings
 * @returns Array of dimensions names
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
