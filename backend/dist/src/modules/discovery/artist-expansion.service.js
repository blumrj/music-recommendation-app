"use strict";
/**
 * ARTIST EXPANSION SERVICE
 *
 * Extracts seed artists from user library and expands them through discovery.
 *
 * RESPONSIBILITY:
 * - Get user's favorite artists from saved albums
 * - Get user's surveyed artists from survey responses
 * - Rank artists by frequency/recency
 * - Provide seed artists for Last.fm expansion
 *
 * KEY INSIGHT:
 * The user's existing music taste is the ANCHOR for discovery.
 * We expand from what they already like, not from random artists.
 *
 * @category Services
 * @module services/artist-expansion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.artistExpansionService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Artist Expansion Service
 *
 * Manages seed artist extraction and discovery expansion.
 *
 * @class ArtistExpansionService
 */
class ArtistExpansionService {
    /**
     * Get all artists from user's saved albums
     *
     * @private
     * @async
     * @param {string} userId - User ID
     *
     * @returns {Promise<Map<string, Date>>} Map of artist → last saved date
     */
    async getSavedAlbumArtists(userId) {
        try {
            const favorites = await prisma.favorite.findMany({
                where: { userId },
                select: {
                    artist: true,
                    createdAt: true
                }
            });
            const artists = new Map();
            for (const fav of favorites) {
                const artist = fav.artist;
                if (artist) {
                    // Keep latest date
                    const existing = artists.get(artist);
                    if (!existing || fav.createdAt > existing) {
                        artists.set(artist, fav.createdAt);
                    }
                }
            }
            console.log(`[ARTIST-EXP] Found ${artists.size} unique artists in saved albums`);
            return artists;
        }
        catch (error) {
            console.error(`[ARTIST-EXP] Error getting saved album artists:`, error.message);
            return new Map();
        }
    }
    /**
     * Get all artists from user's surveyed albums
     *
     * @private
     * @async
     * @param {string} userId - User ID
     *
     * @returns {Promise<Map<string, Date>>} Map of artist → last surveyed date
     */
    async getSurveyedArtists(userId) {
        try {
            const surveys = await prisma.albumSurvey.findMany({
                where: { userId },
                select: {
                    createdAt: true,
                    artist: true
                }
            });
            const artists = new Map();
            for (const survey of surveys) {
                if (survey.artist) {
                    // Keep latest date
                    const existing = artists.get(survey.artist);
                    if (!existing || survey.createdAt > existing) {
                        artists.set(survey.artist, survey.createdAt);
                    }
                }
            }
            console.log(`[ARTIST-EXP] Found ${artists.size} unique artists in surveys`);
            return artists;
        }
        catch (error) {
            console.error(`[ARTIST-EXP] Error getting surveyed artists:`, error.message);
            return new Map();
        }
    }
    /**
     * Extract and rank seed artists from user library
     *
     * STRATEGY:
     * 1. Get artists from saved albums (weight: 1x)
     * 2. Get artists from surveyed albums (weight: 1.5x - surveys are more intentional)
     * 3. Rank by frequency + recency
     * 4. Return top N artists
     *
     * @async
     * @param {string} userId - User ID to extract artists for
     * @param {number} limit - Max seed artists to return
     *
     * @returns {Promise<SeedArtist[]>} Ranked seed artists
     *
     * @example
     * const seeds = await service.getSeedArtists(userId, 10);
     * // Returns: [
     * //   { name: "Bon Iver", frequency: 8, source: "both" },
     * //   { name: "Fleet Foxes", frequency: 5, source: "saved" },
     * //   ...
     * // ]
     */
    async getSeedArtists(userId, limit = 4) {
        console.log(`[ARTIST-EXP] Extracting seed artists for user ${userId}...`);
        try {
            // Get artists from both sources
            const savedArtists = await this.getSavedAlbumArtists(userId);
            const surveyedArtists = await this.getSurveyedArtists(userId);
            if (savedArtists.size === 0 && surveyedArtists.size === 0) {
                console.warn(`[ARTIST-EXP] User ${userId} has no artists in saved or surveyed albums`);
                return [];
            }
            // Combine with weights: surveyed albums are more intentional (1.5x weight)
            const artistScores = new Map();
            for (const [artist, date] of savedArtists.entries()) {
                const current = artistScores.get(artist) || {
                    frequency: 0,
                    lastSeen: date,
                    source: []
                };
                current.frequency += 1;
                current.source.push("saved");
                if (date > current.lastSeen)
                    current.lastSeen = date;
                artistScores.set(artist, current);
            }
            for (const [artist, date] of surveyedArtists.entries()) {
                const current = artistScores.get(artist) || {
                    frequency: 0,
                    lastSeen: date,
                    source: []
                };
                current.frequency += 1.5; // Higher weight for surveys
                current.source.push("surveyed");
                if (date > current.lastSeen)
                    current.lastSeen = date;
                artistScores.set(artist, current);
            }
            // Convert to seed artists and sort by frequency + recency
            const now = Date.now();
            const seedArtists = Array.from(artistScores.entries()).map(([name, data]) => ({
                name,
                frequency: Math.round(data.frequency * 10) / 10, // Round to 1 decimal
                source: (data.source.includes("surveyed") && data.source.includes("saved"))
                    ? "saved" // Prefer "saved" if both
                    : data.source[0],
                lastSeen: data.lastSeen
            }));
            // Sort by: frequency (descending) → recency (descending)
            seedArtists.sort((a, b) => {
                const freqDiff = b.frequency - a.frequency;
                if (freqDiff !== 0)
                    return freqDiff;
                return b.lastSeen.getTime() - a.lastSeen.getTime();
            });
            const topSeeds = seedArtists.slice(0, limit);
            console.log(`[ARTIST-EXP] ✓ Extracted ${topSeeds.length} seed artists:`);
            topSeeds.forEach(artist => {
                console.log(`[ARTIST-EXP]   ${artist.name}: frequency=${artist.frequency.toFixed(1)}, source=${artist.source}`);
            });
            return topSeeds;
        }
        catch (error) {
            console.error(`[ARTIST-EXP] Error extracting seed artists:`, error.message);
            return [];
        }
    }
    /**
     * Get all unique artist names from seed artists
     *
     * Utility to extract just the names for Last.fm queries.
     *
     * @param {SeedArtist[]} seedArtists - Seed artists
     *
     * @returns {string[]} Array of artist names
     */
    static getArtistNames(seedArtists) {
        return seedArtists.map(a => a.name);
    }
    /**
     * Get seeds weighted by frequency
     *
     * For strategies that want to prioritize highly-represented artists.
     *
     * @param {SeedArtist[]} seedArtists - Seed artists
     * @param {number} limit - Max to return
     *
     * @returns {string[]} Top N artist names by frequency
     */
    static getTopByFrequency(seedArtists, limit = 5) {
        return seedArtists
            .slice(0, limit)
            .map(a => a.name);
    }
    /**
     * Get seeds weighted by recency
     *
     * For strategies that want to follow recent user taste changes.
     *
     * @param {SeedArtist[]} seedArtists - Seed artists
     * @param {number} limit - Max to return
     *
     * @returns {string[]} Top N artist names by recency
     */
    static getTopByRecency(seedArtists, limit = 5) {
        const sorted = [...seedArtists].sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
        return sorted.slice(0, limit).map(a => a.name);
    }
}
exports.artistExpansionService = new ArtistExpansionService();
