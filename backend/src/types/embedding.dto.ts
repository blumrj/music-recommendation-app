/**
 * EMOTIONAL EMBEDDING TYPE DEFINITIONS
 * 
 * Type-safe representations of the 7D emotional vector space.
 * Used throughout the recommendation engine for album embeddings,
 * user profiles, and context modifiers.
 * 
 * @category Types
 * @module types/embedding
 */

/**
 * Base 7D Emotional Vector
 * 
 * Represents any point in the emotional vector space.
 * All dimensions are 0-1 scale for easy interpretation.
 * 
 * Can represent:
 * - Album intrinsic properties
 * - User taste profile
 * - Context modifier deltas (use -1 to 1 for deltas)
 * 
 * @interface EmotionalVector
 */
export interface EmotionalVector {
  // Psychological Core (VAD-based)
  valence: number;           // 0 (sad) to 1 (uplifting)
  arousal: number;           // 0 (calm) to 1 (energetic)
  tension: number;           // 0 (relaxed) to 1 (tense)
  
  // Sonic/Atmospheric Properties
  warmth: number;            // 0 (cold) to 1 (warm)
  intimacy: number;          // 0 (distant) to 1 (personal)
  density: number;           // 0 (minimal) to 1 (layered)
  
  // Experiential Property
  groundedness: number;      // 0 (dreamy) to 1 (grounded)
}

/**
 * Album Emotional Embedding
 * 
 * Intrinsic emotional properties of an album.
 * Not user-specific - represents general perception.
 * 
 * Used to find emotionally similar albums and build user profiles.
 * 
 * @interface AlbumEmbedding
 */
export interface AlbumEmbedding extends EmotionalVector {
  // Metadata
  spotifyAlbumId: string;
  albumName?: string;
  artist?: string;
  imageUrl?: string;
  spotifyUrl?: string;
  
  // Quality metrics
  derivedFrom: "audioFeatures" | "surveys" | "collaborative" | "hybrid" | "lastfm";
  confidence: number;  // 0 (low) to 1 (high) - how confident in this embedding?
  
  // Last.fm enrichment
  tags?: any[];  // Array of { tag: string, count: number } from Last.fm
  enrichmentStatus?: string;  // "enriched" | "audio-only" | "pending" | "failed-lastfm"
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Emotional Deviation
 * 
 * Captures how a user perceives an album differently from its intrinsic properties.
 * 
 * Example:
 * - Album intrinsic valence: 0.3 (generally sad)
 * - User perception: 0.7 (finds it comforting)
 * - Deviation: +0.4
 * 
 * Models personalization: "how does THIS user interpret music?"
 * 
 * @interface UserEmotionalDeviation
 */
export interface UserEmotionalDeviation {
  userId: string;
  spotifyAlbumId: string;
  
  // Deviation vector: user perception - intrinsic properties
  // Each value ranges from -1 to +1
  deviationVector: Partial<EmotionalVector>;
  
  // How consistent is this deviation?
  consistency: number;  // 0 (varies) to 1 (stable interpretation)
  
  // Where does this come from?
  source: "survey" | "listening_behavior" | "feedback";
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Context Modifier Vector
 * 
 * Additive modifiers to shift user state based on context.
 * Not a replacement - shifts weights inside user's taste profile.
 * 
 * Each dimension is a delta (-0.3 to +0.3 typically).
 * Example: cold weather might add warmth: +0.15, introspection: +0.20
 * 
 * @interface ContextModifier
 */
export interface ContextModifier {
  // Each value is a delta that gets added to user profile
  valence?: number;          // -0.3 to +0.3
  arousal?: number;          // -0.3 to +0.3
  tension?: number;          // -0.3 to +0.3
  warmth?: number;           // -0.3 to +0.3
  intimacy?: number;         // -0.3 to +0.3
  density?: number;          // -0.3 to +0.3
  groundedness?: number;     // -0.3 to +0.3
  
  // Confidence in this modifier
  confidence?: number;       // 0 to 1
}

/**
 * User Taste Profile
 * 
 * Represents a user's emotional taste as a vector in emotional space.
 * 
 * Computed as:
 * average(intrinsic embeddings of surveyed albums) + average(deviations)
 * 
 * This captures:
 * - What types of albums user gravitates toward
 * - How user uniquely interprets similar music
 * 
 * @interface UserProfile
 */
export interface UserProfile extends EmotionalVector {
  userId: string;
  
  // How many albums contributed to this profile?
  albumsAnalyzed: number;
  
  // Confidence per dimension (which predictions are reliable?)
  dimensionConfidence?: Partial<Record<keyof EmotionalVector, number>>;
  
  // Last update
  updatedAt: Date;
}

/**
 * Current User State (Profile + Context)
 * 
 * The actual emotional state used for recommendations.
 * Computed as: UserTasteProfile + ContextModifier
 * 
 * This is what gets compared to album embeddings for similarity.
 * 
 * @interface CurrentUserState
 */
export interface CurrentUserState extends EmotionalVector {
  userId: string;
  
  // How was this state computed?
  computedFrom: {
    userProfile: UserProfile;
    contextModifier: ContextModifier;
  };
  
  // Timestamp
  computedAt: Date;
}

/**
 * Recommendation Feedback
 * 
 * Tracks what happens when a recommendation is given.
 * Used for validation and behavioral learning.
 * 
 * @interface RecommendationFeedback
 */
export interface RecommendationFeedback {
  id: string;
  userId: string;
  recommendationId: string;
  spotifyAlbumId: string;
  
  // Listening behavior (filled in when user listens)
  listeningDuration?: number;  // seconds
  completed?: boolean;
  skipped?: boolean;
  saved?: boolean;
  
  // Context at time of recommendation
  contextData?: {
    temperature?: number;
    humidity?: number;
    cloudiness?: number;
    timeOfDay?: "morning" | "afternoon" | "evening" | "night";
    season?: "spring" | "summer" | "autumn" | "winter";
  };
  
  // User's reported context
  userReportedContext?: string;  // "focus", "relaxation", "walking", etc.
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Similarity Score Breakdown
 * 
 * Detailed breakdown of recommendation scoring.
 * Used for debugging and understanding recommendations.
 * 
 * @interface SimilarityScoreBreakdown
 */
export interface SimilarityScoreBreakdown {
  albumId: string;
  
  // Component scores (each 0-1)
  emotionalSimilarity: number;  // 55% weight
  userHistoryAffinity: number;  // 20% weight
  noveltyBonus: number;         // 15% weight
  diversityAdjustment: number;  // 10% weight
  
  // Final combined score
  finalScore: number;
  
  // Details for transparency
  details?: {
    emotionalDistance?: number;
    similarityPerDimension?: Partial<Record<keyof EmotionalVector, number>>;
    hasUserListenedBefore?: boolean;
    dayssinceRecommended?: number;
    isInEmotionalCluster?: boolean;
  };
}
