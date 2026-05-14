/**
 * LAST.FM API TYPE DEFINITIONS
 * 
 * Type-safe representations of Last.fm API responses.
 * Used for album/artist tag fetching.
 * 
 * @category Types
 * @module types/lastfm
 */

/**
 * Single tag from Last.fm
 * 
 * Represents a community-voted tag with popularity count.
 * Example: { tag: "dreamy", count: 250 }
 */
export interface LastfmTag {
  tag: string;      // Tag name (lowercase)
  count: number;    // Number of times tagged (popularity indicator)
  url?: string;     // Last.fm URL for tag (optional)
}

/**
 * Last.fm album.getTopTags response
 * 
 * Top tags for a specific album.
 * Typically returns top 10-20 tags.
 */
export interface LastfmAlbumTagsResponse {
  toptags: {
    tag: Array<{
      name: string;
      count: string;  // Note: Last.fm returns as string, needs parsing
      url: string;
    }>;
    "@attr"?: {
      album: string;
      artist: string;
    };
  };
}

/**
 * Last.fm artist.getTopTags response
 * 
 * Top tags for a specific artist.
 * Used as fallback if album not found.
 */
export interface LastfmArtistTagsResponse {
  toptags: {
    tag: Array<{
      name: string;
      count: string;  // Note: Last.fm returns as string, needs parsing
      url: string;
    }>;
    "@attr"?: {
      artist: string;
    };
  };
}

/**
 * Error response from Last.fm API
 */
export interface LastfmErrorResponse {
  error: number;
  message: string;
}

/**
 * Parsed tag result (internal format)
 * 
 * Normalized representation of Last.fm tags.
 */
export interface ParsedLastfmTag {
  tag: string;
  count: number;
  url?: string;
}
