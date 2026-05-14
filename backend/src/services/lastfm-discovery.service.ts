/**
 * LAST.FM DISCOVERY SERVICE
 * 
 * Expands user's music graph through Last.fm's artist and album relationships.
 * 
 * RESPONSIBILITY:
 * - Retrieve similar artists for seed artists
 * - Get top albums from related artists
 * - Explore tag ecosystem (Phase 2)
 * - Build broad candidate pool for emotional ranking
 * 
 * PHILOSOPHY:
 * Last.fm is the DISCOVERY LAYER, not the recommendation engine.
 * It expands the search space so our 7D emotional ranking can find better matches.
 * 
 * @category Services
 * @module services/lastfm-discovery
 */

import { lastfmClient } from "../utils/lastfm-client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Album candidate for recommendation pool
 */
interface AlbumCandidate {
  spotifyAlbumId?: string;
  albumName: string;
  artist: string;
  imageUrl?: string;
  spotifyUrl?: string;
  source: "similar-artists" | "top-albums" | "exploratory" | "tag-based";
  confidence: number;  // How confident we are this is a good candidate
}

/**
 * Last.fm Discovery Service
 * 
 * Orchestrates Last.fm API calls to expand discovery graph.
 * 
 * @class LastfmDiscoveryService
 */
class LastfmDiscoveryService {
  /**
   * Get similar artists from Last.fm
   * 
   * @private
   * @async
   * @param {string} artistName - Artist to find similar artists for
   * @param {number} limit - Max similar artists to return
   * 
   * @returns {Promise<string[]>} Array of similar artist names
   */
  private async getSimilarArtistsFromLastfm(
    artistName: string,
    limit: number = 15
  ): Promise<string[]> {
    try {
      console.log(`[LASTFM] Getting similar artists for "${artistName}"...`);
      
      const response = await lastfmClient.getSimilarArtists(artistName, limit);
      
      if (!response || !Array.isArray(response)) {
        console.warn(`[LASTFM] No similar artists found for "${artistName}"`);
        return [];
      }
      
      const similarArtists = response
        .map((artist: any) => artist.name)
        .filter((name: string) => name && name.length > 0);
      
      console.log(`[LASTFM] ✓ Found ${similarArtists.length} similar artists for "${artistName}"`);
      
      return similarArtists;
    } catch (error: any) {
      console.warn(`[LASTFM] Error getting similar artists for "${artistName}":`, error.message);
      return [];
    }
  }

  /**
   * Get top albums from an artist
   * 
   * @private
   * @async
   * @param {string} artistName - Artist name
   * @param {number} limit - Max albums to return
   * 
   * @returns {Promise<AlbumCandidate[]>} Array of album candidates
   */
  private async getTopAlbumsFromLastfm(
    artistName: string,
    limit: number = 10
  ): Promise<AlbumCandidate[]> {
    try {
      console.log(`[LASTFM] Getting top ${limit} albums for "${artistName}"...`);
      
      const response = await lastfmClient.getTopAlbumsByArtist(artistName, limit);
      
      if (!response || !Array.isArray(response)) {
        console.warn(`[LASTFM] No albums found for "${artistName}"`);
        return [];
      }
      
      const albums: AlbumCandidate[] = response
        .map((album: any) => {
          const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${album.name} ${artistName}`)}`;
          return {
            albumName: album.name,
            artist: artistName,
            imageUrl: album.image?.[album.image.length - 1]?.["#text"],
            spotifyUrl: spotifySearchUrl,
            source: "top-albums" as const,
            confidence: 0.7  // Good confidence for top albums
          };
        })
        .filter((album: AlbumCandidate) => album.albumName && album.albumName.length > 0);
      
      console.log(`[LASTFM] ✓ Found ${albums.length} top albums for "${artistName}"`);
      
      return albums;
    } catch (error: any) {
      console.warn(`[LASTFM] Error getting top albums for "${artistName}":`, error.message);
      return [];
    }
  }

  /**
   * Expand similar artists to create discovery graph
   * 
   * For each seed artist:
   * 1. Get similar artists from Last.fm
   * 2. Get top albums from each similar artist
   * 3. Return flattened album list
   * 
   * @async
   * @param {string[]} seedArtistNames - Artist names to expand from
   * @param {number} maxRelatedPerArtist - Max related artists per seed
   * @param {number} maxAlbumsPerArtist - Max albums per related artist
   * 
   * @returns {Promise<AlbumCandidate[]>} Candidate albums from related artists
   * 
   * @example
   * const candidates = await service.expandSimilarArtists(
   *   ["Bon Iver", "Fleet Foxes"],
   *   15,  // 15 similar artists per seed
   *   10   // 10 top albums per related artist
   * );
   * // Returns: ~300 album candidates
   */
  async expandSimilarArtists(
    seedArtistNames: string[],
    maxRelatedPerArtist: number = 15,
    maxAlbumsPerArtist: number = 10
  ): Promise<AlbumCandidate[]> {
    console.log(`[LASTFM] Expanding ${seedArtistNames.length} seed artists via Last.fm...`);
    
    const allAlbums: AlbumCandidate[] = [];
    
    for (const seedArtist of seedArtistNames) {
      try {
        // STEP 1: Get similar artists
        const similarArtists = await this.getSimilarArtistsFromLastfm(
          seedArtist,
          maxRelatedPerArtist
        );
        
        if (similarArtists.length === 0) {
          console.warn(`[LASTFM] No similar artists found for seed "${seedArtist}"`);
          continue;
        }
        
        // STEP 2: Get top albums from each similar artist
        for (const relatedArtist of similarArtists) {
          const topAlbums = await this.getTopAlbumsFromLastfm(
            relatedArtist,
            maxAlbumsPerArtist
          );
          allAlbums.push(...topAlbums);
        }
      } catch (error: any) {
        console.error(`[LASTFM] Error expanding seed artist "${seedArtist}":`, error.message);
      }
    }
    
    console.log(`[LASTFM] ✓ Expansion complete: ${allAlbums.length} candidate albums from ${seedArtistNames.length} seeds`);
    
    return allAlbums;
  }

  /**
   * Explore top albums by tag (Phase 2 feature)
   * 
   * For emotionally-aligned tags:
   * "dream pop", "slowcore", "ambient folk", "ethereal", "post-rock"
   * 
   * Retrieve top albums tagged with these terms.
   * 
   * @async
   * @param {string[]} emotionalTags - Tags to explore ("dream pop", "slowcore", etc.)
   * @param {number} maxAlbumsPerTag - Max albums per tag
   * 
   * @returns {Promise<AlbumCandidate[]>} Candidate albums from tags
   * 
   * @note Phase 2 feature - implement after initial deployment
   */
  async expandByTags(
    emotionalTags: string[],
    maxAlbumsPerTag: number = 20
  ): Promise<AlbumCandidate[]> {
    console.log(`[LASTFM] Exploring ${emotionalTags.length} emotional tags...`);
    
    const allAlbums: AlbumCandidate[] = [];
    
    for (const tag of emotionalTags) {
      try {
        console.log(`[LASTFM] Getting top albums for tag "${tag}"...`);
        
        const response = await lastfmClient.getTopAlbumsByTag(tag, maxAlbumsPerTag);
        
        if (!response || !Array.isArray(response)) {
          console.warn(`[LASTFM] No albums found for tag "${tag}"`);
          continue;
        }
        
        const albums: AlbumCandidate[] = response
          .map((album: any) => {
            const artistName = album.artist?.name || "Unknown";
            const spotifySearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${album.name} ${artistName}`)}`;
            return {
              albumName: album.name,
              artist: artistName,
              imageUrl: album.image?.[album.image.length - 1]?.["#text"],
              spotifyUrl: spotifySearchUrl,
              source: "tag-based" as const,
              confidence: 0.6  // Lower confidence for tag-based (more diverse)
            };
          })
          .filter((album: AlbumCandidate) => album.albumName && album.artist);
        
        console.log(`[LASTFM] ✓ Found ${albums.length} albums for tag "${tag}"`);
        allAlbums.push(...albums);
      } catch (error: any) {
        console.warn(`[LASTFM] Error getting albums for tag "${tag}":`, error.message);
      }
    }
    
    console.log(`[LASTFM] ✓ Tag exploration complete: ${allAlbums.length} candidate albums`);
    
    return allAlbums;
  }

  /**
   * Deduplicate candidates by album name + artist
   * 
   * Last.fm expansion can return duplicates across different paths.
   * 
   * @static
   * @param {AlbumCandidate[]} albums - Albums to deduplicate
   * 
   * @returns {AlbumCandidate[]} Deduplicated albums
   */
  static deduplicateCandidates(albums: AlbumCandidate[]): AlbumCandidate[] {
    const seen = new Set<string>();
    const deduplicated: AlbumCandidate[] = [];
    
    for (const album of albums) {
      const key = `${album.albumName.toLowerCase()}|${album.artist.toLowerCase()}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(album);
      }
    }
    
    console.log(`[LASTFM] Deduplication: ${albums.length} → ${deduplicated.length} unique albums`);
    
    return deduplicated;
  }

  /**
   * Merge multiple candidate sources into one pool
   * 
   * Combines:
   * - Similar artist albums
   * - Top albums
   * - Tag-based albums
   * - Exploratory albums
   * 
   * @static
   * @param {...AlbumCandidate[][]} sourceLists - Multiple arrays of candidates
   * 
   * @returns {AlbumCandidate[]} Merged and deduplicated pool
   */
  static mergeCandidateSources(...sourceLists: AlbumCandidate[][]): AlbumCandidate[] {
    const merged = sourceLists.flat();
    console.log(`[LASTFM] Merging ${sourceLists.length} sources: ${sourceLists.map(s => s.length).join(" + ")} = ${merged.length} total`);
    
    return this.deduplicateCandidates(merged);
  }
}

export const lastfmDiscoveryService = new LastfmDiscoveryService();
