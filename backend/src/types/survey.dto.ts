/**
 * SURVEY DTOs (Data Transfer Objects)
 * 
 * Defines the shape of data passed between controllers, services, and database
 */

/**
 * Data required to save a survey response for an album
 * Sent from frontend -> controller -> service -> database
 * 
 * Supports both old (multi-select) and new (Phase 1 sliders) response formats
 */
export interface SaveSurveyDTO {
  userId: string;
  spotifyAlbumId: string;
  albumName: string;
  artist: string;
  imageUrl: string;
  
  // OLD format (backward compatible)
  seasons?: string[];
  emotions?: string[];
  whenYouListen?: string[];
  movementPreference?: string;
  vibe?: string[];
  optionalNote?: string;
  
  // PHASE 1: New 7D slider responses (0-100 scale)
  valence_response?: number;          // 0=Sad, 100=Happy/Uplifting
  arousal_response?: number;          // 0=Calm, 100=Energized
  tension_response?: number;          // 0=Relaxed, 100=Tense/Anxious
  warmth_response?: number;           // 0=Cold, 100=Warm
  intimacy_response?: number;         // 0=Distant, 100=Personal
  density_response?: number;          // 0=Sparse, 100=Rich/Layered
  groundedness_response?: number;     // 0=Dreamy, 100=Grounded/Real
}
