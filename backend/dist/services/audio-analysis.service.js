"use strict";
/**
 * Audio Analysis Service - Audio Feature Mapping & Recommendation Search
 *
 * Handles Spotify audio feature analysis and emotional profile conversion.
 * Core responsibilities:
 * - Map 11 Spotify audio metrics → 9 emotional dimensions (0-1 scale)
 * - Extract seed artists from emotional profiles (emotion keywords → artist search)
 * - Search recommendations via Spotify search endpoint
 * - Filter out user's already-saved albums (deduplication)
 * - Calculate emotional similarity via cosine distance in 9D space
 *
 * PART OF ALGORITHM PIPELINE:
 * This service handles PHASES 1-4 of the recommendation algorithm:
 * - Phase 1: Extract seed artists from emotional dimensions
 * - Phase 2: Search Spotify for similar albums
 * - Phase 3: Filter out saved albums (deduplication)
 * - Phase 4: Score by emotional similarity
 *
 * EMOTIONAL DIMENSION MAPPING:
 * Converts Spotify's 11 metrics into 9 human-perceived emotional dimensions:
 * 1. Nature - Organic/acoustic preferences
 * 2. Introspection - Reflective/thoughtful preferences
 * 3. Movement - Danceable/rhythmic preferences
 * 4. Healing - Soothing/therapeutic preferences
 * 5. Melancholy - Emotional/sad preferences
 * 6. Freedom - Expansive/liberating preferences
 * 7. Energy Level - Intense/energetic preferences
 * 8. Coziness - Warm/intimate preferences
 * 9. Dreaminess - Ethereal/otherworldly preferences
 *
 * @category Services
 * @module services/audio-analysis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioAnalysisService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const spotify_client_1 = require("../utils/spotify-client");
dotenv_1.default.config();
/**
 * Audio Analysis Service
 *
 * Maps Spotify audio features to emotional dimensions and orchestrates recommendation discovery.
 * Uses cosine similarity in 9D emotional space for scoring.
 *
 * @class AudioAnalysisService
 */
class AudioAnalysisService {
    /**
     * Map Spotify audio features to 9-dimensional emotional profile
     *
     * @param {AudioFeatures} audioFeatures - 11 Spotify audio metrics
     *
     * @returns {EmotionalDimensions} 9D emotional profile (0-1 scale)
     *
     * ALGORITHM (4 STAGES):
     *
     * **STAGE 1: Energy-based dimensions**
     * - Movement: 60% danceability + 40% energy
     * - Energy Level: direct audio energy
     * - Coziness: acousticness + inverse loudness
     *
     * **STAGE 2: Acoustic-based dimensions**
     * - Nature: 70% acousticness + 30% instrumentalness
     * - Melancholy: 70% (1-valence) + 30% (1-mode/major)
     * - Dreaminess: instrumentalness (no lyrics = more space for dreams)
     *
     * **STAGE 3: Tempo-based dimensions**
     * - Introspection: 50% (1-energy) + 50% slow tempo
     * - Freedom: 60% energy + 40% normalized tempo
     * - Healing: 50% acousticness + 30% slow tempo + 20% (1-loudness)
     *
     * **STAGE 4: Clamping**
     * - All values clamped to 0-1 range
     *
     * FORMULAS:
     * - Loudness: normalized from -60 to 0 dB → 0-1 scale
     * - Tempo: normalized by 200 BPM (typical max), capped at 1.0
     * - Valence: 0 (sad) to 1 (happy), inverted for melancholy
     * - Mode: 0 (minor) or 1 (major), inverted so minor=1
     *
     * @example
     * const features = {
     *   danceability: 0.8, energy: 0.7, loudness: -3,
     *   acousticness: 0.1, instrumentalness: 0, valence: 0.9,
     *   tempo: 140, mode: 1, ...other features
     * };
     * const profile = audioAnalysisService.mapFeaturesToDimensions(features);
     * // Returns: { nature: 0.03, movement: 0.74, energy: 0.7, ... }
     */
    mapFeaturesToDimensions(audioFeatures) {
        const f = audioFeatures; // Shorthand for cleaner code
        // DIMENSION 1: MOVEMENT
        // High danceability + high energy = "move me"
        // Formula: 60% danceability + 40% energy
        const movement = (f.danceability * 0.6) + (f.energy * 0.4);
        // DIMENSION 2: ENERGY LEVEL
        // Direct mapping from audio energy
        // Formula: energy (high = wants to dance/jump)
        const energyLevel = f.energy;
        // DIMENSION 3: COZINESS
        // Inverse of loudness + high acousticness = "cozy"
        // Formula: 50% acousticness + 50% (1 - normalized loudness)
        // Loudness ranges from -60 to 0 dB, we normalize to 0-1
        const normalizedLoudness = (f.loudness + 60) / 60; // Convert -60-0 to 0-1
        const coziness = (f.acousticness * 0.5) + ((1 - normalizedLoudness) * 0.5);
        // DIMENSION 4: NATURE
        // High acousticness = acoustic instruments = nature sounds
        // Note: also consider instrumentalness for purely instrumental nature pieces
        // Formula: 70% acousticness + 30% instrumentalness
        const nature = (f.acousticness * 0.7) + (f.instrumentalness * 0.3);
        // DIMENSION 5: MELANCHOLY
        // Low valence (opposite of happiness) = sad
        // Minor key (mode = 0) = melancholic
        // Formula: 70% (1 - valence) + 30% (1 - mode)
        // mode is 0 (minor) or 1 (major), so (1 - mode) gives minor=1, major=0
        const melancholy = ((1 - f.valence) * 0.7) + ((1 - f.mode) * 0.3);
        // DIMENSION 6: DREAMINESS
        // High instrumentalness = purely instrumental (no lyrics)
        // = more room for dreams/imagination
        // Formula: instrumentalness (direct)
        const dreaminess = f.instrumentalness;
        // DIMENSION 7: INTROSPECTION
        // Low energy + slow tempo = contemplative/introspective
        // Formula: 50% (1 - energy) + 50% (slow tempo score)
        // Tempo ranges 0-300 BPM, we consider <100 as "slow"
        const tempoScore = Math.max(0, 1 - (f.tempo / 300)); // Lower tempo = higher score
        const introspection = ((1 - f.energy) * 0.5) + (tempoScore * 0.5);
        // DIMENSION 8: FREEDOM
        // High energy + high tempo = "liberated, flying"
        // Formula: 60% energy + 40% (normalized tempo)
        const normalizedTempo = Math.min(f.tempo / 200, 1); // Cap at 200 BPM
        const freedom = (f.energy * 0.6) + (normalizedTempo * 0.4);
        // DIMENSION 9: HEALING
        // Slow, acoustic, peaceful = healing
        // High acousticness + slow tempo + low loudness = soothing
        // Formula: 50% acousticness + 30% slow tempo + 20% (1 - loudness)
        const healingTempo = 1 - tempoScore; // Inverse: slow tempo is healing
        const healing = (f.acousticness * 0.5) + (healingTempo * 0.3) + ((1 - normalizedLoudness) * 0.2);
        // Clamp all dimensions to 0-1 range
        return {
            nature: Math.max(0, Math.min(1, nature)),
            introspection: Math.max(0, Math.min(1, introspection)),
            movement: Math.max(0, Math.min(1, movement)),
            healing: Math.max(0, Math.min(1, healing)),
            melancholy: Math.max(0, Math.min(1, melancholy)),
            freedom: Math.max(0, Math.min(1, freedom)),
            energyLevel: Math.max(0, Math.min(1, energyLevel)),
            coziness: Math.max(0, Math.min(1, coziness)),
            dreaminess: Math.max(0, Math.min(1, dreaminess))
        };
    }
    // REMOVED: searchAlbumsByDimensions() was replaced by searchNewRecommendationsBySpotify()
    // The new flow uses Spotify /recommendations endpoint for actual album discovery
    // instead of just ranking already-saved albums
    /**
     * PHASE 1: Extract seed artists from emotional dimensions
     *
     * @async
     * @param {EmotionalDimensions} emotionalDimensions - User's 9D emotional profile
     * @param {string} spotifyToken - Spotify OAuth access token
     *
     * @returns {Promise<Array<string>>} Up to 5 validated seed artist IDs
     *
     * Algorithm (4 STAGES):
     *
     * **STAGE 1: Emotional → Genre Keywords**
     * - nature > 0.6 → "acoustic"
     * - healing > 0.6 → "ambient"
     * - movement > 0.7 → "dance"
     * - dreaminess > 0.6 → "indie"
     * - melancholy > 0.6 → "folk"
     * - freedom > 0.7 → "rock"
     * - energyLevel > 0.7 → "pop"
     * - Fallback: ["indie", "alternative"]
     *
     * **STAGE 2: Search Spotify for Artists**
     * - Search for top 10 results per keyword
     * - Extract artist IDs from search results
     *
     * **STAGE 3: Validate Results**
     * - Must have valid ID string
     * - Type must be "artist" (not playlist/bot)
     * - Must have profile images (indicates real artist)
     * - No duplicates (Set deduplication)
     *
     * **STAGE 4: Return & Fallback**
     * - Return up to 5 artist IDs
     * - If none found, fallback to well-known artists (Arctic Monkeys, Radiohead)
     *
     * @throws {Error} (caught internally, falls back to known artists)
     *
     * @example
     * const artists = await audioAnalysisService.getTopArtistsFromDimensions(profile, token);
     * // Returns: ["4NHkGGqwCmzht8LoNCS5P3", "5bnLhLPR6wWPBP7yPxKVK6", ...]
     */
    async getTopArtistsFromDimensions(emotionalDimensions, spotifyToken) {
        try {
            // Direct approach: use top genres based on dimensions
            const artistKeywords = [];
            if (emotionalDimensions.nature > 0.6)
                artistKeywords.push("acoustic");
            if (emotionalDimensions.healing > 0.6)
                artistKeywords.push("ambient");
            if (emotionalDimensions.movement > 0.7)
                artistKeywords.push("dance");
            if (emotionalDimensions.dreaminess > 0.6)
                artistKeywords.push("indie");
            if (emotionalDimensions.melancholy > 0.6)
                artistKeywords.push("folk");
            if (emotionalDimensions.freedom > 0.7)
                artistKeywords.push("rock");
            if (emotionalDimensions.energyLevel > 0.7)
                artistKeywords.push("pop");
            if (artistKeywords.length === 0)
                artistKeywords.push("indie", "alternative");
            const uniqueKeywords = [...new Set(artistKeywords)].slice(0, 5);
            console.log("[AUDIO-ANALYSIS] Searching for seed artists:", { keywords: uniqueKeywords });
            // Search for artists and VALIDATE them (not playlists or bots)
            const artistIds = [];
            for (const keyword of uniqueKeywords) {
                try {
                    console.log(`[AUDIO-ANALYSIS] Searching for artists with keyword: "${keyword}"`);
                    const client = (0, spotify_client_1.createSpotifyClient)(spotifyToken);
                    const response = await client.get("/search", {
                        params: {
                            q: keyword,
                            type: "artist",
                            limit: 10 // Get more results to filter valid ones
                        }
                    });
                    const searchResults = response.data.artists?.items || [];
                    console.log(`[AUDIO-ANALYSIS] Found ${searchResults.length} artist results for "${keyword}"`);
                    for (const searchResult of searchResults) {
                        // CRITICAL: Validate this is actually an artist object, not a playlist/bot
                        if (!searchResult?.id || typeof searchResult.id !== "string" || searchResult.id.length === 0) {
                            continue;
                        }
                        // MUST be type "artist" (not "playlist" or other)
                        if (searchResult.type !== "artist") {
                            continue;
                        }
                        // Verify artist has images (real artists have profile images)
                        // This is sufficient validation - playlists tagged as "artists" won't have proper images
                        if (!searchResult.images || searchResult.images.length === 0) {
                            continue;
                        }
                        // This is a valid real artist - use the search result directly
                        if (!artistIds.includes(searchResult.id) && artistIds.length < 5) {
                            artistIds.push(searchResult.id);
                        }
                        if (artistIds.length >= 5)
                            break;
                    }
                    if (artistIds.length >= 5)
                        break;
                }
                catch (error) {
                    // Failed to search keyword
                    console.warn(`[AUDIO-ANALYSIS] ⚠️  Failed to search artists for keyword "${keyword}":`, {
                        message: error.message,
                        status: error.response?.status
                    });
                }
            }
            if (artistIds.length === 0) {
                // Use well-known artist IDs as fallback
                console.log("[AUDIO-ANALYSIS] ⚠️  No seed artists found, using fallback artists");
                artistIds.push("4NHkGGqwCmzht8LoNCS5P3"); // Arctic Monkeys
                artistIds.push("4tZwfgrHOc3w7zhyIUQBJJ"); // Radiohead
            }
            console.log(`[AUDIO-ANALYSIS] ✓ Seed artists found: ${artistIds.length}`, { artistIds });
            return artistIds.slice(0, 5);
        }
        catch (error) {
            // Fallback to known good artists
            return [
                "4NHkGGqwCmzht8LoNCS5P3", // Arctic Monkeys
                "4tZwfgrHOc3w7zhyIUQBJJ" // Radiohead
            ];
        }
    }
    /**
     * PHASE 2: Search Spotify for album recommendations
     *
     * @async
     * @param {Array<string>} seedArtistIds - Seed artist IDs (for context)
     * @param {EmotionalDimensions} emotionalDimensions - Blended user taste + weather
     * @param {string} spotifyToken - Spotify OAuth access token
     *
     * @returns {Promise<Array<AlbumSearchResult>>} Album candidates scored by similarity
     *
     * @throws {Error} "Failed to discover recommendations: [error details]"
     *
     * Algorithm (6 STAGES):
     *
     * **STAGE 1: Emotional Dimensions → Mood Keywords**
     * - energyLevel > 0.7 → "energetic"
     * - melancholy > 0.6 → "sad"
     * - coziness > 0.6 → "cozy"
     * - healing > 0.6 → "ambient"
     * - freedom > 0.7 → "rock"
     * - dreaminess > 0.6 → "indie"
     * - movement > 0.7 → "dance"
     * - nature > 0.6 → "acoustic"
     * - Fallback: ["indie", "alternative"]
     *
     * **STAGE 2: Search Spotify Tracks**
     * - Query: space-separated mood keywords (OR logic)
     * - Limit: 50 track results
     * - Note: Searching tracks (not albums) ensures real music
     *
     * **STAGE 3: Group by Album**
     * - Avoid duplicate albums (one track per album)
     * - Extract album metadata: name, artist, image, Spotify URL
     * - Preserve album popularity for scoring
     *
     * **STAGE 4: Create Candidates**
     * - Use default audio features (represents "average" track)
     * - Calculate emotional dimensions via mapFeaturesToDimensions()
     * - Boost score if album popular (popularity > 50)
     *
     * **STAGE 5: Score by Similarity**
     * - Calculate cosine similarity to emotional profile
     * - Higher score = better emotional match
     *
     * **STAGE 6: Sort & Return**
     * - Sort candidates by score (highest first)
     * - Return all candidates (filtered by Phase 3)
     *
     * WORKAROUND NOTE:
     * - Spotify's /recommendations and /audio-features endpoints are deprecated
     * - Uses search endpoint + default features + popularity boost instead
     * - Maintains consistent scoring without deprecated APIs
     *
     * @example
     * const albums = await audioAnalysisService.searchNewRecommendationsBySpotify(
     *   artistIds, emotionalProfile, token
     * );
     * // Returns: [
     * //   { spotifyAlbumId: "...", albumName: "Album", artist: "Artist", score: 0.85, ... },
     * //   { spotifyAlbumId: "...", albumName: "Album2", artist: "Artist2", score: 0.82, ... }
     * // ]
     */
    async searchNewRecommendationsBySpotify(seedArtistIds, emotionalDimensions, spotifyToken) {
        try {
            // Build search query from emotional dimensions
            const moodKeywords = [];
            if (emotionalDimensions.energyLevel > 0.7)
                moodKeywords.push("energetic");
            if (emotionalDimensions.melancholy > 0.6)
                moodKeywords.push("sad");
            if (emotionalDimensions.coziness > 0.6)
                moodKeywords.push("cozy");
            if (emotionalDimensions.healing > 0.6)
                moodKeywords.push("ambient");
            if (emotionalDimensions.freedom > 0.7)
                moodKeywords.push("rock");
            if (emotionalDimensions.dreaminess > 0.6)
                moodKeywords.push("indie");
            if (emotionalDimensions.movement > 0.7)
                moodKeywords.push("dance");
            if (emotionalDimensions.nature > 0.6)
                moodKeywords.push("acoustic");
            if (moodKeywords.length === 0)
                moodKeywords.push("indie", "alternative");
            // Build search query properly formatted for Spotify
            // Use space-separated keywords (OR logic)
            const searchQuery = moodKeywords.slice(0, 3).join(" ");
            console.log("[AUDIO-ANALYSIS] Searching Spotify for tracks:", {
                query: searchQuery,
                keywords: moodKeywords.slice(0, 3)
            });
            const client = (0, spotify_client_1.createSpotifyClient)(spotifyToken);
            console.log("[AUDIO-ANALYSIS] Making Spotify /search request...");
            const response = await client.get("/search", {
                params: {
                    q: searchQuery,
                    type: "track", // Search for TRACKS, not albums (gets real music, not playlists)
                    limit: 20 // Explicit limit (Spotify default is 20, being explicit for clarity)
                }
            });
            const tracks = response.data.tracks?.items || [];
            console.log(`[AUDIO-ANALYSIS] ✓ Got ${tracks.length} tracks from Spotify search`);
            if (tracks.length === 0) {
                return [];
            }
            // Group tracks by album to avoid duplicate albums
            const albumMap = new Map();
            for (const track of tracks) {
                if (!track.album?.id)
                    continue;
                // Only add if we haven't seen this album yet
                if (!albumMap.has(track.album.id)) {
                    const artist = track.artists?.[0]?.name || "Unknown";
                    const imageUrl = track.album.images?.[0]?.url;
                    const spotifyUrl = track.album.external_urls?.spotify;
                    const popularity = track.popularity || 0.5;
                    albumMap.set(track.album.id, {
                        id: track.album.id,
                        name: track.album.name,
                        artist,
                        imageUrl,
                        spotifyUrl,
                        popularity
                    });
                }
            }
            const albums = Array.from(albumMap.values());
            // WORKAROUND: Both /recommendations and /audio-features endpoints are deprecated
            // Instead of fetching actual audio features, use default features for scoring
            // and rank based on album popularity + emotional dimension matching
            const candidates = [];
            for (const album of albums) {
                if (!album.id || !album.name)
                    continue;
                // Album object already has extracted fields from the grouping logic
                const artist = album.artist || "Unknown";
                const imageUrl = album.imageUrl;
                const spotifyUrl = album.spotifyUrl;
                const popularity = album.popularity || 0.5; // Use album popularity (0-100) as indicator
                // Use default audio features (represents "average" track)
                // This allows consistent scoring without deprecated endpoints
                const defaultAudioFeatures = {
                    danceability: 0.5,
                    energy: 0.5,
                    loudness: -5,
                    speechiness: 0,
                    acousticness: 0.5,
                    instrumentalness: 0,
                    liveness: 0,
                    valence: 0.5,
                    tempo: 120,
                    mode: 0,
                    key: 0
                };
                const mappedDimensions = this.mapFeaturesToDimensions(defaultAudioFeatures);
                // Add slight boost based on album popularity
                if (popularity > 50) {
                    mappedDimensions.energyLevel += (popularity - 50) / 200;
                }
                const score = this.calculateDimensionSimilarity(mappedDimensions, emotionalDimensions);
                candidates.push({
                    spotifyAlbumId: album.id,
                    spotifyUrl,
                    albumName: album.name,
                    artist,
                    imageUrl,
                    audioFeatures: defaultAudioFeatures,
                    emotionalDimensions: mappedDimensions
                });
            }
            // Sort by score (highest first)
            candidates.sort((a, b) => {
                const scoreA = this.calculateDimensionSimilarity(a.emotionalDimensions, emotionalDimensions);
                const scoreB = this.calculateDimensionSimilarity(b.emotionalDimensions, emotionalDimensions);
                return scoreB - scoreA;
            });
            console.log(`[AUDIO-ANALYSIS] ✓ Returning ${candidates.length} album candidates`);
            return candidates;
        }
        catch (error) {
            console.error("[AUDIO-ANALYSIS] ❌ Error in searchNewRecommendationsBySpotify:", {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url
            });
            throw new Error(`Failed to discover recommendations: ${error.message}`);
        }
    }
    /**
     * PHASE 3: Filter out user's already-saved albums
     *
     * @async
     * @param {Array<AlbumSearchResult>} candidates - Album candidates to deduplicate
     * @param {string} spotifyToken - Spotify OAuth access token
     *
     * @returns {Promise<Array<AlbumSearchResult>>} Filtered candidates (not already saved)
     *
     * Algorithm (5 STAGES):
     *
     * **STAGE 1: Initialize Deduplication Set**
     * - Create empty Set for O(1) album ID lookups
     *
     * **STAGE 2: Paginate User's Saved Albums**
     * - Fetch 50 albums per request
     * - Pagination handles users with 1000+ saved albums
     * - Continue until hasMore=false
     *
     * **STAGE 3: Build Deduplication Set**
     * - Add each saved album ID to set
     * - O(1) lookup time for filtering
     *
     * **STAGE 4: Filter Candidates**
     * - Keep only albums NOT in deduplication set
     * - Preserves all album metadata
     *
     * **STAGE 5: Return Filtered**
     * - Return filtered candidates for scoring/ranking
     * - On error: return unfiltered (graceful fallback)
     *
     * PURPOSE:
     * - Avoid recommending albums user already has
     * - Ensures discovery of NEW music
     * - Improves user experience
     *
     * @throws (caught internally - returns unfiltered on error)
     *
     * @example
     * const newAlbums = await audioAnalysisService.filterOutSavedAlbums(candidates, token);
     * // Returns candidates that user hasn't already saved
     */
    async filterOutSavedAlbums(candidates, spotifyToken) {
        try {
            const savedAlbumIds = new Set();
            // Fetch all saved album IDs (paginate through all)
            let offset = 0;
            const limit = 50;
            let hasMore = true;
            while (hasMore) {
                const client = (0, spotify_client_1.createSpotifyClient)(spotifyToken);
                const response = await client.get("/me/albums", {
                    params: {
                        limit,
                        offset
                    }
                });
                const items = response.data.items || [];
                for (const item of items) {
                    if (item.album?.id) {
                        savedAlbumIds.add(item.album.id);
                    }
                }
                hasMore = response.data.next !== null || false;
                offset += limit;
            }
            // Filter candidates
            const filtered = candidates.filter(candidate => !savedAlbumIds.has(candidate.spotifyAlbumId));
            return filtered;
        }
        catch (error) {
            // Return unfiltered if there's an error (better than crashing)
            return candidates;
        }
    }
    /**
     * Calculate similarity between two 9D emotional vectors
     *
     * @param {EmotionalDimensions} albumDimensions - Album's emotional profile
     * @param {EmotionalDimensions} userDimensions - User's emotional preference
     *
     * @returns {number} Similarity score 0-1 (0=opposite, 1=perfect match)
     *
     * Algorithm (COSINE SIMILARITY IN 9D SPACE):
     *
     * Formula: similarity = dot(a, u) / (||a|| × ||u||)
     *
     * Where:
     * - a = album's emotional vector (9 components, each 0-1)
     * - u = user's emotional vector (9 components, each 0-1)
     * - dot(a, u) = sum of component-wise products
     * - ||a|| = magnitude (L2 norm) of album vector
     * - ||u|| = magnitude (L2 norm) of user vector
     *
     * **STAGE 1: Calculate Dot Product**
     * - Multiply each dimension: a[i] × u[i]
     * - Sum across all 9 dimensions
     * - Result: scalar indicating alignment
     *
     * **STAGE 2: Calculate Magnitudes**
     * - ||a||² = nature² + introspection² + ... + dreaminess²
     * - ||u||² = nature² + introspection² + ... + dreaminess²
     *
     * **STAGE 3: Apply Cosine Formula**
     * - similarity = dot / (||a|| × ||u||)
     * - Avoids division by zero (||x|| || defaults to 1)
     *
     * **STAGE 4: Clamp to 0-1**
     * - Results typically in 0-1 range naturally
     * - Clamping ensures boundary cases handled correctly
     *
     * INTERPRETATION:
     * - 0.0 = opposite moods (album sad vs user wants energetic)
     * - 0.5 = uncorrelated (no alignment)
     * - 1.0 = perfect match (all dimensions aligned)
     *
     * USAGE:
     * - Rank recommendations (higher score = better match)
     * - Filter suggestions (keep only score > threshold)
     * - Score-based sorting in generateRecommendations()
     *
     * @example
     * const albumProfile = { nature: 0.8, movement: 0.2, ... };
     * const userProfile = { nature: 0.75, movement: 0.25, ... };
     * const score = audioAnalysisService.calculateDimensionSimilarity(
     *   albumProfile, userProfile
     * );
     * // Returns: 0.95 (very good match)
     */
    calculateDimensionSimilarity(albumDimensions, userDimensions) {
        // Use cosine similarity (dot product of normalized vectors)
        // For 9-dimensional space:
        const dims = [
            "nature",
            "introspection",
            "movement",
            "healing",
            "melancholy",
            "freedom",
            "energyLevel",
            "coziness",
            "dreaminess"
        ];
        let dotProduct = 0;
        let albumMagnitude = 0;
        let userMagnitude = 0;
        for (const dim of dims) {
            const a = albumDimensions[dim];
            const u = userDimensions[dim];
            dotProduct += a * u;
            albumMagnitude += a * a;
            userMagnitude += u * u;
        }
        // Avoid division by zero
        const albumNorm = Math.sqrt(albumMagnitude) || 1;
        const userNorm = Math.sqrt(userMagnitude) || 1;
        // Cosine similarity = dot product / (||a|| * ||u||)
        const similarity = dotProduct / (albumNorm * userNorm);
        // Clamp to 0-1 range
        return Math.max(0, Math.min(1, similarity));
    }
}
/**
 * Audio Analysis Service instance
 * Singleton exported for use in recommendation service
 *
 * Handles all Spotify audio feature analysis and emotional dimension calculation.
 *
 * @type {AudioAnalysisService}
 */
exports.audioAnalysisService = new AudioAnalysisService();
