/**
 * TAG CLASSIFIER SERVICE
 * 
 * Classifies Last.fm tags into categories: emotional, genre, metadata, other.
 * Used by signal fusion to determine which signals are available.
 * 
 * RESPONSIBILITY:
 * - Categorize tags based on type
 * - Provide metrics for signal quality assessment
 * - Return classified tags for downstream processing
 * 
 * @category Services
 * @module services/tag-classifier
 */

import { ParsedLastfmTag } from "../../types/lastfm.dto";

interface ClassifiedTags {
  emotional: string[];
  genre: string[];
  metadata: string[];
  other: string[];
  metrics: {
    emotionalCount: number;
    genreCount: number;
    metadataCount: number;
    totalTags: number;
    emotionalRatio: number;  // emotional / total
  };
}

/**
 * Tag Classifier Service
 * 
 * Categorizes Last.fm tags for signal fusion
 */
class TagClassifierService {
  /**
   * Emotional descriptors (pure emotional/atmospheric adjectives)
   * These are NOT genres - just mood, atmosphere, or feeling descriptors
   * 
   * Genres (soul, funk, ambient, etc.) should be classified as GENRES, not emotional
   */
  private emotionalKeywords: Set<string> = new Set([
    // Core emotional descriptors
    "dreamy", "ethereal", "atmospheric", "melancholic", "melancholy",
    "cheerful", "happy", "joyful", "sad", "gloomy", "dark", "bright",
    "warm", "cold", "cozy", "intimate", "distant", "lonely",
    "vibrant", "energetic", "calm", "soothing", "relaxing", "peaceful",
    "tense", "angry", "aggressive", "violent", "intense", "powerful",
    "gentle", "soft", "delicate", "fragile", "tender", "harsh", "rough",
    "spacious", "open", "expansive", "confined", "claustrophobic", "tight",
    "lush", "rich", "sparse", "minimal", "dense", "layered",
    "organic", "natural", "synthetic", "artificial",
    "nostalgic", "retro", "vintage", "contemporary", "modern", "current",
    "grounded", "earthy", "floating", "escapist",
    "introspective", "reflective", "contemplative", "external",
    "dynamic", "static", "evolving", "rhythmic", "pulsing", "flowing",
    "vivid", "muted", "sharp", "blurry",
    "uplifting", "depressing", "healing", "therapeutic", "energizing", "draining",
    "surreal", "mysterious", "shadowy", "luminous",
  ]);

  /**
   * Genre database (~100 common music genres)
   */
  private genreDatabase: Set<string> = new Set([
    // Rock and variants
    "rock", "indie rock", "alternative rock", "psychedelic rock", "progressive rock",
    "hard rock", "heavy rock", "soft rock", "post-rock", "post-punk", "punk",
    "punk rock", "garage rock", "glam rock", "art rock", "noise rock",
    
    // Metal
    "metal", "heavy metal", "black metal", "death metal", "thrash metal",
    "doom metal", "power metal", "progressive metal", "metalcore", "deathcore",
    "grindcore", "sludge", "gothic metal",
    
    // Pop
    "pop", "synth-pop", "electropop", "indie pop", "art pop", "chamber pop",
    "baroque pop", "dream pop", "lo-fi pop", "k-pop", "j-pop",
    
    // Electronic and Dance
    "electronic", "techno", "house", "deep house", "tech house", "minimal techno",
    "industrial", "industrial rock", "ebm", "futurepop", "darkwave",
    "synthwave", "vaporwave", "chillwave", "downtempo", "ambient house",
    "trance", "progressive house", "acid house", "drum and bass", "jungle",
    "breakcore", "dubstep", "grime", "garage", "uk garage", "2-step",
    
    // Hip-hop and Rap
    "hip-hop", "rap", "trap", "cloud rap", "lo-fi hip-hop", "underground hip-hop",
    "boom bap", "conscious rap", "gangsta rap", "emo rap", "drill",
    
    // R&B and Soul
    "r&b", "neo-soul", "soul", "funk", "disco", "new jack swing",
    "contemporary r&b", "quiet storm",
    
    // Jazz and Blues
    "jazz", "cool jazz", "bebop", "fusion jazz", "smooth jazz", "free jazz",
    "avant-garde jazz", "blues", "electric blues", "blues rock", "bluegrass",
    
    // Classical and Instrumental
    "classical", "orchestral", "chamber music", "symphony", "concerto", "sonata",
    "baroque", "renaissance", "romantic", "contemporary classical", "minimalism",
    "post-minimalism", "ambient", "drone", "instrumental", "post-rock instrumental",
    
    // Folk, Country, and Roots
    "folk", "indie folk", "folk rock", "country", "alt-country", "americana",
    "roots", "world music", "reggae", "dub", "ska", "rocksteady",
    
    // Other Genres
    "experimental", "avant-garde", "noise", "glitch", "IDM", "intelligent drum and bass",
    "trip-hop", "acid jazz", "funk rock", "nu metal", "alternative",
    "indie", "emo", "screamo", "mathrock", "post-hardcore", "grunge",
    "shoegaze", "noise pop", "slowcore", "lofi", "vaporwave", "synthpop",
    "darkwave", "gothic rock", "post-punk revival", "new wave", "synth rock"
  ]);

  /**
   * Metadata patterns (years, curator labels, etc.)
   */
  private metadataPatterns: RegExp[] = [
    /^\d{4}$/,                    // Year: "2020", "1985"
    /^(19|20)\d{2}s$/,            // Decade: "2000s", "1990s"
    /^(best of|top\s+\d+|favourite|favorite)/i,  // Curator: "best of 2020", "top 100"
    /^(loved|liked|added|marked)/i,               // Personal labels
    /^(various|compilation|soundtrack|ost)/i,   // Album types
    /^(remaster|reissue|edition|version|remix)/i // Release types
  ];

  /**
   * Classify an array of Last.fm tags
   * 
   * @param tags - Parsed Last.fm tags
   * @returns Classified tags with metrics
   */
  classify(tags: ParsedLastfmTag[]): ClassifiedTags {
    console.log(`[TAG-CLASSIFIER] Classifying ${tags.length} tags...`);

    const emotional: string[] = [];
    const genre: string[] = [];
    const metadata: string[] = [];
    const other: string[] = [];

    for (const tag of tags) {
      const normalized = tag.tag.toLowerCase().trim();
      
      // Check metadata first (most specific patterns)
      if (this.isMetadata(normalized)) {
        metadata.push(tag.tag);
      }
      // Check emotional keywords
      else if (this.emotionalKeywords.has(normalized)) {
        emotional.push(tag.tag);
      }
      // Check genre database
      else if (this.isGenre(normalized)) {
        genre.push(tag.tag);
      }
      // Other
      else {
        other.push(tag.tag);
      }
    }

    const totalTags = tags.length;
    const emotionalRatio = totalTags > 0 ? emotional.length / totalTags : 0;

    const result: ClassifiedTags = {
      emotional,
      genre,
      metadata,
      other,
      metrics: {
        emotionalCount: emotional.length,
        genreCount: genre.length,
        metadataCount: metadata.length,
        totalTags,
        emotionalRatio
      }
    };

    console.log(`[TAG-CLASSIFIER] Results:`, {
      emotional: emotional.length,
      genre: genre.length,
      metadata: metadata.length,
      other: other.length,
      emotionalRatio: emotionalRatio.toFixed(2)
    });

    return result;
  }

  /**
   * Check if tag is metadata
   * 
   * @private
   * @param tag - Normalized tag (lowercase)
   * @returns True if tag matches metadata patterns
   */
  private isMetadata(tag: string): boolean {
    for (const pattern of this.metadataPatterns) {
      if (pattern.test(tag)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if tag is a genre (exact match or substring)
   * 
   * Handles both exact matches ("indie rock") and variations ("indie-rock")
   * 
   * @private
   * @param tag - Normalized tag (lowercase)
   * @returns True if tag is a known genre
   */
  private isGenre(tag: string): boolean {
    // Exact match
    if (this.genreDatabase.has(tag)) {
      return true;
    }

    // Normalize separators: "indie-rock" → "indie rock"
    const normalized = tag.replace(/[-_]/g, " ");
    if (this.genreDatabase.has(normalized)) {
      return true;
    }

    // Check if tag contains a known genre as substring
    // E.g., "indie rock fusion" contains "indie rock"
    for (const genre of this.genreDatabase) {
      if (tag.includes(genre) || normalized.includes(genre)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get emotional keywords for testing/debugging
   */
  getEmotionalKeywords(): string[] {
    return Array.from(this.emotionalKeywords).sort();
  }

  /**
   * Get genre database for testing/debugging
   */
  getGenres(): string[] {
    return Array.from(this.genreDatabase).sort();
  }

  /**
   * Add custom emotional keyword (for extensibility)
   */
  addEmotionalKeyword(keyword: string): void {
    this.emotionalKeywords.add(keyword.toLowerCase());
  }

  /**
   * Add custom genre (for extensibility)
   */
  addGenre(genre: string): void {
    this.genreDatabase.add(genre.toLowerCase());
  }
}

// Export singleton instance
export const tagClassifierService = new TagClassifierService();
