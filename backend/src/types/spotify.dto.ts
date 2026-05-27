/**
 * Spotify API DTOs
 * Types for data transfer from Spotify API
 */

/**
 * Spotify Album Image object
 */
export interface SpotifyImageDTO {
  url: string;
  height?: number;
  width?: number;
}

/**
 * Spotify Artist object
 */
export interface SpotifyArtistDTO {
  name: string;
  id: string;
  external_urls?: Record<string, string>;
}

/**
 * Spotify Album object (nested in items)
 */
export interface SpotifyAlbumDTO {
  id: string;
  name: string;
  images: SpotifyImageDTO[];
  artists: SpotifyArtistDTO[];
  external_urls: {
    spotify: string;
  };
}

/**
 * Spotify Album Item (wraps album object)
 */
export interface SpotifyAlbumItemDTO {
  album: SpotifyAlbumDTO;
}

/**
 * Spotify saved albums response
 */
export interface SpotifyAlbumsResponseDTO {
  items: SpotifyAlbumItemDTO[];
  total?: number;
  limit?: number;
  offset?: number;
}

/**
 * Our internal formatted album DTO
 * Used to return albums to controllers/frontend
 */
export interface FormattedAlbumDTO {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  spotifyUrl: string;
}

/**
 * Spotify OAuth token response
 * Returned when exchanging authorization code or refreshing tokens
 */
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Spotify user profile
 * Returned from Spotify /v1/me endpoint
 */
export interface SpotifyUserProfile {
  id: string;
  email: string;
  display_name: string;
  images: { url: string }[];
}
