/**
 * Audio Analysis DTOs
 * Types for audio features, emotional dimensions, and album search results
 */

/**
 * Raw Spotify audio features for a track
 * Returned from Spotify /audio-features endpoint
 */
export interface AudioFeatures {
  danceability: number;      // 0-1: How suitable for dancing
  energy: number;            // 0-1: Intensity and activity
  loudness: number;          // dB: Overall loudness (-60 to 0)
  speechiness: number;       // 0-1: Presence of spoken words
  acousticness: number;      // 0-1: Confidence measure of acoustic sound
  instrumentalness: number;  // 0-1: Prediction of no vocals
  liveness: number;          // 0-1: Presence of audience
  valence: number;           // 0-1: Musical positiveness (happy = high)
  tempo: number;             // BPM: Overall estimated tempo
  mode: number;              // 0 = minor key, 1 = major key
  key: number;               // 0-11: Pitch class notation
}

/**
 * User's emotional profile across 9 dimensions
 * Mapped from audio features via mapFeaturesToDimensions()
 * Each dimension ranges 0-1 representing emotional intensity
 */
export interface EmotionalDimensions {
  nature: number;          // Acoustic, natural sounds (0-1)
  introspection: number;   // Contemplative, slow, low energy (0-1)
  movement: number;        // Danceable, rhythmic (0-1)
  healing: number;         // Soothing, calm, acoustic (0-1)
  melancholy: number;      // Sad, minor key, low valence (0-1)
  freedom: number;         // Energetic, fast tempo, high energy (0-1)
  energyLevel: number;     // Overall energy of track (0-1)
  coziness: number;        // Warm, acoustic, low loudness (0-1)
  dreaminess: number;      // Instrumental, atmospheric (0-1)
}

/**
 * Album recommendation result from Spotify search
 * Includes metadata and emotional/audio analysis
 */
export interface AlbumSearchResult {
  spotifyAlbumId: string;     // Spotify album ID
  spotifyUrl?: string;        // Link to album on Spotify
  albumName: string;          // Album title
  artist: string;             // Primary artist name
  imageUrl?: string;          // Album artwork URL
  audioFeatures: AudioFeatures;              // Raw audio features
  emotionalDimensions: EmotionalDimensions; // Mapped emotional profile
}
