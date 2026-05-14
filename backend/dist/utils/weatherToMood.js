"use strict";
/**
 * WEATHER TO MOOD MAPPER
 *
 * Converts real-world weather conditions and temperature into emotional context
 * and audio feature preferences. Maps weather data to emotional dimensions that
 * guide the recommendation algorithm towards contextually appropriate songs.
 *
 * KEY RESPONSIBILITY:
 * - Map weather condition (sunny, rainy, cloudy, stormy) to mood
 * - Adjust emotional profile based on temperature
 * - Detect season from temperature for context
 * - Return emotional dimensions (0-1 scale) + audio feature ranges
 *
 * @category Utils
 * @module utils/weatherToMood
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapWeatherToMood = mapWeatherToMood;
/**
 * Detect season from temperature
 *
 * Rough approximation based on Celsius temperature.
 * Can be overridden by actual location/calendar data in future.
 *
 * STAGE 1: Classify temperature into seasonal bands
 * STAGE 2: Return season string for context
 *
 * @param temp - Temperature in Celsius
 * @returns Season string ("summer" | "spring" | "autumn" | "winter")
 */
function detectSeason(temp) {
    if (temp > 20)
        return "summer";
    if (temp > 10)
        return "spring";
    if (temp > 5)
        return "autumn";
    return "winter";
}
/**
 * Map weather condition and temperature to emotional context
 *
 * Converts weather data into a complete emotional profile that guides
 * album recommendation selection. Each weather condition maps to specific
 * emotional dimensions and audio feature preferences.
 *
 * Weather conditions handled:
 * - Sunny/Clear → Happy, energetic, high movement/freedom
 * - Rainy/Storm → Melancholic, introspective, healing
 * - Cloudy → Balanced, exploratory, dreamy
 * - Hot (>25°C) → Party, excitement, high energy/movement
 * - Cold (<5°C) → Cozy, introspective, comfort-seeking
 * - Other → Balanced defaults
 *
 * STAGE 1: Normalize condition string and detect season
 * STAGE 2: Map condition to mood parameters and emotional dimensions
 * STAGE 3: Return both mood map (for filtering) and emotional context (for scoring)
 *
 * @param condition - Weather condition string (e.g., "Clear", "Rain", "Clouds")
 * @param temp - Temperature in Celsius
 * @returns Object with moodMap (audio feature ranges, keywords) and emotionalContext (9D profile)
 */
function mapWeatherToMood(condition, temp) {
    const normalizedCondition = condition.toLowerCase();
    const season = detectSeason(temp);
    // SUNNY/CLEAR = Upbeat, energetic, happy
    if (normalizedCondition.includes("clear") || normalizedCondition.includes("sunny")) {
        return {
            moodMap: {
                mood: "happy",
                energyRange: [0.6, 1.0], // Prefer energetic songs
                danceabilityRange: [0.6, 1.0], // Prefer danceable
                acousticnessRange: [0, 0.5], // Prefer electronic/produced
                keywords: ["pop", "dance", "funk"]
            },
            emotionalContext: {
                weather: "sunny",
                temperature: temp,
                season,
                emotionalDimensions: {
                    nature: 0.5,
                    introspection: 0.2,
                    movement: 0.8, // Want to move
                    healing: 0.3,
                    melancholy: 0.1,
                    freedom: 0.8, // Open sky = liberation
                    energyLevel: 0.8, // Vibrant, upbeat
                    coziness: 0.2,
                    dreaminess: 0.3
                }
            }
        };
    }
    // RAINY/STORM = Melancholic, introspective, calm
    if (normalizedCondition.includes("rain") || normalizedCondition.includes("storm")) {
        return {
            moodMap: {
                mood: "melancholic",
                energyRange: [0, 0.4], // Prefer calm songs
                danceabilityRange: [0, 0.3], // Prefer not danceable
                acousticnessRange: [0.5, 1.0], // Prefer acoustic/real instruments
                keywords: ["acoustic", "indie", "emotional"]
            },
            emotionalContext: {
                weather: "rainy",
                temperature: temp,
                season,
                emotionalDimensions: {
                    nature: 0.8, // Rain = natural, powerful element
                    introspection: 0.8, // Gray skies = inward focus
                    movement: 0.25, // Slow pace, contemplative walking
                    healing: 0.7, // Cathartic cleansing
                    melancholy: 0.7, // Somber, wistful mood
                    freedom: 0.3, // Contained, weather holds you
                    energyLevel: 0.2, // Quiet, calm
                    coziness: 0.7, // Shelter-seeking
                    dreaminess: 0.6 // Gray world = ethereal, misty
                }
            }
        };
    }
    // CLOUDY = Neutral, exploratory, chill
    if (normalizedCondition.includes("cloud")) {
        return {
            moodMap: {
                mood: "chill",
                energyRange: [0.3, 0.7], // Medium energy
                danceabilityRange: [0.3, 0.7], // Medium danceability
                acousticnessRange: [0.2, 0.8], // Balanced
                keywords: ["ambient", "indie", "alternative"]
            },
            emotionalContext: {
                weather: "cloudy",
                temperature: temp,
                season,
                emotionalDimensions: {
                    nature: 0.6,
                    introspection: 0.5,
                    movement: 0.5, // Could go either way
                    healing: 0.5,
                    melancholy: 0.4,
                    freedom: 0.5,
                    energyLevel: 0.5, // Balanced
                    coziness: 0.5,
                    dreaminess: 0.5 // Soft, diffused light = dreamy
                }
            }
        };
    }
    // HOT = Party, energy, excitement
    if (temp > 25) {
        return {
            moodMap: {
                mood: "party",
                energyRange: [0.7, 1.0],
                danceabilityRange: [0.7, 1.0],
                acousticnessRange: [0, 0.3],
                keywords: ["electronic", "hip-hop", "dance"]
            },
            emotionalContext: {
                weather: "hot",
                temperature: temp,
                season,
                emotionalDimensions: {
                    nature: 0.4,
                    introspection: 0.1,
                    movement: 0.9, // Want to move, dance, be outside
                    healing: 0.3,
                    melancholy: 0.0,
                    freedom: 0.9, // Heat = freedom, celebration
                    energyLevel: 0.9, // Very vibrant, intense
                    coziness: 0.0, // Too hot to be cozy
                    dreaminess: 0.2
                }
            }
        };
    }
    // COLD = Cozy, introspective, warm
    if (temp < 5) {
        return {
            moodMap: {
                mood: "cozy",
                energyRange: [0.2, 0.6],
                danceabilityRange: [0.2, 0.6],
                acousticnessRange: [0.4, 1.0],
                keywords: ["indie", "soul", "acoustic"]
            },
            emotionalContext: {
                weather: "cold",
                temperature: temp,
                season: "winter",
                emotionalDimensions: {
                    nature: 0.8, // Winter nature = beautiful, stark
                    introspection: 0.7, // Cold pulls you inward
                    movement: 0.3, // Slow pace, careful steps
                    healing: 0.6, // Comfort-seeking
                    melancholy: 0.5, // Wistful, bittersweet
                    freedom: 0.3, // Cold confines
                    energyLevel: 0.3, // Quiet, reserved
                    coziness: 0.9, // Want warmth and comfort
                    dreaminess: 0.7 // Clear cold air = crystalline, dream-like
                }
            }
        };
    }
    // Default: balanced
    return {
        moodMap: {
            mood: "balanced",
            energyRange: [0.4, 0.8],
            danceabilityRange: [0.4, 0.8],
            acousticnessRange: [0.3, 0.7],
            keywords: ["alternative", "indie", "pop"]
        },
        emotionalContext: {
            weather: "neutral",
            temperature: temp,
            season,
            emotionalDimensions: {
                nature: 0.5,
                introspection: 0.5,
                movement: 0.5,
                healing: 0.5,
                melancholy: 0.5,
                freedom: 0.5,
                energyLevel: 0.5,
                coziness: 0.5,
                dreaminess: 0.5
            }
        }
    };
}
