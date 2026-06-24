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

export interface UserProfileDimension {
  name: string;
  label: string;
  value: number; // 0-1 scale
}

export interface UserTasteProfile {
  dimensions: UserProfileDimension[];
  albumsAnalyzed: number;
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
  tasteProfile?: UserTasteProfile;
}

// ===== ALBUMS & RECOMMENDATIONS =====

export interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  spotifyUrl?: string;
  source?: 'spotify' | 'catalog';
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
  recommendations?: Recommendation[];
  genres?: GenreCollection[];
  tracks?: Recommendation[];
  generatedAt?: string;
}

export interface WeatherContext {
  condition: string;
  temp: number;
  humidity: number;
  season: string;
  timeOfDay: string;
}

// ===== SLIDER RESPONSES (SURVEY) =====

export interface SliderResponses {
  [key: string]: number;
}
