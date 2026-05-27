/**
 * Consolidated Types
 * All active types for the application
 */

// ===== USER & AUTHENTICATION =====

export interface User {
  id: string;
  email: string;
  name: string;
  spotifyId: string;
}

// ===== EMOTIONAL DIMENSIONS & SURVEY =====

export interface EmotionalDimension {
  name: string;
  description: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

export interface SurveyedAlbumsResponse {
  albums: Album[];
  totalCount: number;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  profileGenerated: boolean;
  surveyCount: number;
  needsOnboarding: boolean;
  readyForAnalysis: boolean;
  tasteProfile?: Record<string, number>;
}

// ===== ALBUMS & RECOMMENDATIONS =====

export interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  spotifyUrl?: string;
}

export interface Recommendation extends Album {
  id: string; // spotify ID
  image: string; // imageUrl alias for API responses
}

export interface GenreCollection {
  name: string;
  albums: Recommendation[];
}

export interface RecommendationsResponse {
  mood?: string;
  weather?: {
    condition: string;
    temp: number;
    humidity: number;
  };
  recommendations?: Recommendation[];
  genres?: GenreCollection[];
  tracks?: Recommendation[];
}

// ===== SLIDER RESPONSES (SURVEY) =====

export interface SliderResponses {
  [key: string]: number;
}
