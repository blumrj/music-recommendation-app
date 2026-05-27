"use strict";
/**
 * CONTEXT MODIFIER SERVICE
 *
 * Converts real-world context (weather, time, environment) into
 * additive emotional modifiers that shift user preferences.
 *
 * CORE PRINCIPLE:
 * Context modifies listening tendencies, NOT emotional identity.
 * Weather doesn't replace user taste - it weights their existing preferences.
 *
 * ARCHITECTURE:
 * Instead of:
 *   Weather (rainy) → Emotion (sad) → Find sad albums
 *
 * Now:
 *   Weather (rainy) → Modifiers (introspection +0.20, movement -0.15)
 *                  → Reweight user's existing taste profile
 *                  → Find emotionally similar albums from user's perspective
 *
 * @category Services
 * @module services/context-modifier
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextModifierService = void 0;
const normalization_1 = require("../../shared/math/normalization");
/**
 * Context Modifier Service
 *
 * Computes additive emotional modifiers from weather and temporal context.
 *
 * @class ContextModifierService
 */
class ContextModifierService {
    /**
     * Determine current time of day based on hour
     *
     * @private
     * @returns {"morning" | "afternoon" | "evening" | "night"} Time period
     */
    computeTimeOfDay() {
        const hour = new Date().getHours();
        if (hour < 6)
            return "night";
        if (hour < 12)
            return "morning";
        if (hour < 17)
            return "afternoon";
        return "evening";
    }
    /**
     * Determine current season based on month
     *
     * @private
     * @returns {"spring" | "summer" | "autumn" | "winter"} Season
     */
    computeSeason() {
        const month = new Date().getMonth();
        if (month >= 2 && month < 5)
            return "spring";
        if (month >= 5 && month < 8)
            return "summer";
        if (month >= 8 && month < 11)
            return "autumn";
        return "winter";
    }
    /**
     * Map weather condition to precipitation intensity
     *
     * @private
     * @param {string} condition - OpenWeatherMap condition (e.g., "Rainy", "Sunny")
     * @returns {number} Intensity 0-1 representing precipitation amount
     */
    computePrecipitationIntensity(condition) {
        if (condition === "Rainy" || condition === "Thunderstorm")
            return 0.8;
        if (condition === "Drizzle")
            return 0.3;
        if (condition === "Snow")
            return 0.6;
        return 0;
    }
    /**
     * Compute context modifier from weather and time
     *
     * SELF-CONTAINED APPROACH:
     * Takes only raw weather data and computes all contextual factors internally:
     * - Current time of day (from system clock)
     * - Current season (from system clock)
     * - Precipitation intensity (from weather condition)
     *
     * Combines these into additive emotional modifiers.
     * Modifiers stay in [-0.3, +0.3] range (soft influence, not override).
     *
     * STRATEGY:
     * 1. Compute time, season, precipitation from raw inputs
     * 2. Parse each weather variable
     * 3. Generate mini-modifier for each
     * 4. Sum them (multiple factors compound)
     * 5. Compute overall confidence
     * 6. Normalize to valid range
     * 7. Return modifiers + computed time/season for consumer use
     *
     * @async
     * @param {Object} weatherData - Current weather conditions (raw from API)
     * @param {number} weatherData.temperature - Celsius (-60 to +60 typical)
     * @param {string} weatherData.condition - OpenWeatherMap condition (e.g., "Rainy", "Sunny")
     * @param {number} weatherData.cloudiness - 0 (clear) to 1 (overcast)
     * @param {number} weatherData.humidity - 0-100%
     * @param {number} weatherData.visibility - kilometers
     *
     * @returns {Promise<ContextModifier & {timeOfDay: string, season: string}>} Emotional modifiers + computed context
     *
     * @example
     * const result = await contextModifierService.computeContextModifier({
     *   temperature: 5,
     *   condition: "Rainy",
     *   cloudiness: 0.9,
     *   humidity: 85,
     *   visibility: 2
     * });
     * // Result: { warmth: +0.15, introspection: +0.25, ..., timeOfDay: "evening", season: "winter" }
     */
    async computeContextModifier(weatherData) {
        // Compute contextual factors internally
        const timeOfDay = this.computeTimeOfDay();
        const season = this.computeSeason();
        const precipitationIntensity = this.computePrecipitationIntensity(weatherData.condition);
        // Start with zero modifiers
        const modifier = {};
        // ─────────────────────────────────────────────────────────────────────
        // TEMPERATURE EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const tempModifiers = this.computeTemperatureModifiers(weatherData.temperature);
        Object.assign(modifier, tempModifiers);
        // ─────────────────────────────────────────────────────────────────────
        // PRECIPITATION EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const precipModifiers = this.computePrecipitationModifiers(precipitationIntensity);
        Object.assign(modifier, (0, normalization_1.addModifiers)(modifier, precipModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // CLOUDINESS EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const cloudModifiers = this.computeCloudModifiers(weatherData.cloudiness);
        Object.assign(modifier, (0, normalization_1.addModifiers)(modifier, cloudModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // TIME OF DAY EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const timeModifiers = this.computeTimeOfDayModifiers(timeOfDay);
        Object.assign(modifier, (0, normalization_1.addModifiers)(modifier, timeModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // SEASONAL EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const seasonModifiers = this.computeSeasonalModifiers(season);
        Object.assign(modifier, (0, normalization_1.addModifiers)(modifier, seasonModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // COMPOUND INTERACTIONS
        // ─────────────────────────────────────────────────────────────────────
        // Some effects compound (e.g., cold + rainy is more introspective than either alone)
        const compoundModifiers = this.computeCompoundInteractions({
            temperature: weatherData.temperature,
            precipitationIntensity,
            cloudiness: weatherData.cloudiness,
            timeOfDay,
            season
        });
        Object.assign(modifier, (0, normalization_1.addModifiers)(modifier, compoundModifiers));
        // Normalize to valid range (uses shared implementation)
        const normalized = (0, normalization_1.normalizeModifier)(modifier);
        // Copy normalized values back
        Object.assign(modifier, normalized);
        // Compute overall confidence
        modifier.confidence = this.computeContextConfidence({
            temperature: weatherData.temperature,
            precipitationIntensity,
            cloudiness: weatherData.cloudiness,
            humidity: weatherData.humidity,
            visibility: weatherData.visibility
        });
        // Return modifiers + computed context for consumer
        return {
            ...modifier,
            timeOfDay,
            season
        };
    }
    /**
     * Temperature modifiers
     *
     * Hot (>25°C):
     * - arousal +0.15 (want to move, be active)
     * - groundedness -0.10 (want to be outside, less introspection)
     * - movement +0.10
     *
     * Cold (<5°C):
     * - warmth +0.20 (seek coziness)
     * - introspection +0.15 (inward tendency)
     * - movement -0.10 (slower pace)
     * - nostalgia +0.10 (cozy memories)
     *
     * Mild (5-25°C):
     * - Minimal modifiers (neutral context)
     *
     * @private
     * @param {number} temp - Temperature in Celsius
     * @returns {ContextModifier}
     */
    computeTemperatureModifiers(temp) {
        const modifiers = {};
        if (temp > 25) {
            // HOT: activate, move, explore
            modifiers.arousal = 0.15;
            modifiers.groundedness = -0.10;
            modifiers.arousal = (modifiers.arousal ?? 0) + 0.10; // amplify arousal for movement
            modifiers.warmth = -0.10; // don't want more warmth
        }
        else if (temp < 5) {
            // COLD: seek comfort, introspection
            modifiers.warmth = 0.20;
            modifiers.intimacy = 0.15;
            modifiers.arousal = (modifiers.arousal ?? 0) - 0.10; // reduce arousal
            modifiers.valence = 0.10;
        }
        // Else: mild temp, no temperature modifiers
        return modifiers;
    }
    /**
     * Precipitation modifiers
     *
     * Heavy rain (>0.6):
     * - introspection +0.25 (turn inward)
     * - movement -0.15 (slower, contemplative)
     * - arousal -0.15 (calm down)
     * - nostalgia +0.08 (melancholic atmosphere)
     *
     * Light rain (0.2-0.6):
     * - introspection +0.10
     * - movement -0.05
     *
     * No rain:
     * - No precipitation modifiers
     *
     * @private
     * @param {number} intensity - Precipitation intensity 0-1
     * @returns {ContextModifier}
     */
    computePrecipitationModifiers(intensity) {
        const modifiers = {};
        if (intensity > 0.6) {
            // HEAVY RAIN: strong introspective effect
            modifiers.intimacy = 0.25; // seek introspection
            modifiers.arousal = -0.15; // slower pace
            modifiers.arousal = (modifiers.arousal ?? 0) - 0.15; // cumulative calm
            modifiers.valence = 0.08; // melancholic mood
        }
        else if (intensity > 0.2) {
            // LIGHT RAIN: subtle effect
            modifiers.intimacy = 0.10; // slight introspection
            modifiers.arousal = (modifiers.arousal ?? 0) - 0.05; // slow down
        }
        // No rain: no modifiers
        return modifiers;
    }
    /**
     * Cloudiness modifiers
     *
     * Overcast (>0.7):
     * - arousal -0.10 (reduce energy)
     * - dreaminess +0.12 (diffuse light = dreamy)
     * - introspection +0.08
     *
     * Partly cloudy (0.3-0.7):
     * - Minimal effect
     *
     * Clear (<0.3):
     * - arousal +0.12 (boost energy)
     * - groundedness -0.08 (more exploration)
     * - movement +0.08
     *
     * @private
     * @param {number} cloudiness - Cloudiness 0-1
     * @returns {ContextModifier}
     */
    computeCloudModifiers(cloudiness) {
        const modifiers = {};
        if (cloudiness > 0.7) {
            // OVERCAST: muted energy
            modifiers.arousal = -0.10;
            modifiers.groundedness = 0.08; // more grounded/real
            modifiers.intimacy = 0.08; // more reflective
        }
        else if (cloudiness < 0.3) {
            // CLEAR: boost energy
            modifiers.arousal = 0.12;
            modifiers.groundedness = -0.08; // more exploratory
            modifiers.arousal += 0.08; // movement energy
        }
        // Partly cloudy: no modifiers
        return modifiers;
    }
    /**
     * Time of day modifiers
     *
     * Morning:
     * - arousal +0.15 (waking up, energy)
     * - introspection -0.10 (external focus)
     *
     * Afternoon:
     * - Minimal (neutral peak hours)
     *
     * Evening:
     * - introspection +0.20 (winding down)
     * - arousal -0.10
     * - nostalgia +0.10
     *
     * Night:
     * - introspection +0.25 (inward)
     * - arousal -0.20 (calm down)
     * - nostalgia +0.15
     * - groundedness +0.10
     *
     * @private
     * @param {string} timeOfDay
     * @returns {ContextModifier}
     */
    computeTimeOfDayModifiers(timeOfDay) {
        const modifiers = {};
        switch (timeOfDay) {
            case "morning":
                modifiers.arousal = 0.15;
                modifiers.intimacy = -0.10; // external focus
                break;
            case "afternoon":
                // Neutral - already at peak
                break;
            case "evening":
                modifiers.intimacy = 0.20; // winding down/introspection
                modifiers.arousal = -0.10;
                modifiers.valence = 0.10; // nostalgic tone
                break;
            case "night":
                modifiers.intimacy = 0.25; // inward/introspective
                modifiers.arousal = -0.20; // calm down
                modifiers.valence = 0.15; // nostalgic/personal
                modifiers.groundedness = 0.10;
                break;
        }
        return modifiers;
    }
    /**
     * Seasonal modifiers
     *
     * Autumn:
     * - nostalgia +0.20 (memories, endings)
     * - introspection +0.15
     * - arousal -0.10
     *
     * Winter:
     * - warmth +0.25 (seek coziness)
     * - nostalgia +0.15
     * - introspection +0.20
     *
     * Spring:
     * - arousal +0.15 (renewal)
     * - groundedness -0.10 (exploration)
     *
     * Summer:
     * - arousal +0.12
     * - movement +0.10
     * - introspection -0.10
     *
     * @private
     * @param {string} season
     * @returns {ContextModifier}
     */
    computeSeasonalModifiers(season) {
        const modifiers = {};
        switch (season) {
            case "autumn":
                modifiers.valence = 0.20; // nostalgic/melancholic
                modifiers.intimacy = 0.15; // reflective
                modifiers.arousal = -0.10;
                break;
            case "winter":
                modifiers.warmth = 0.25;
                modifiers.valence = 0.15; // nostalgic/cozy
                modifiers.intimacy = 0.20; // introspective
                break;
            case "spring":
                modifiers.arousal = 0.15;
                modifiers.groundedness = -0.10;
                break;
            case "summer":
                modifiers.arousal = 0.12;
                modifiers.arousal += 0.10; // energy/movement
                modifiers.intimacy = -0.10; // external focus
                break;
        }
        return modifiers;
    }
    /**
     * Compound interaction effects
     *
     * Some combinations have synergistic effects:
     * - Cold + Rainy: more introspective than either alone
     * - Clear + Warm: more movement + energy
     * - Night + Cold: seek even more warmth
     *
     * @private
     * @param {Object} weatherData
     * @returns {ContextModifier}
     */
    computeCompoundInteractions(weatherData) {
        const modifiers = {};
        // Cold + Rainy: compound introspection
        if (weatherData.temperature < 5 && weatherData.precipitationIntensity > 0.5) {
            modifiers.intimacy = 0.10; // introspection bonus
            modifiers.valence = 0.05; // nostalgic bonus
        }
        // Clear + Warm: compound movement
        if (weatherData.temperature > 20 && weatherData.cloudiness < 0.3) {
            modifiers.arousal = 0.08; // movement bonus
            modifiers.groundedness = -0.05; // bonus exploration
        }
        // Night + Cold: seek warmth
        if (weatherData.timeOfDay === "night" && weatherData.temperature < 5) {
            modifiers.warmth = 0.10; // bonus
        }
        return modifiers;
    }
    /**
     * Add two modifier objects together (element-wise)
     *
     * Used to combine modifiers from different factors.
     *
     * @private
     * @param {ContextModifier} a
     * @param {ContextModifier} b
     * @returns {ContextModifier}
     */
    addModifiers(a, b) {
        const result = { ...a };
        Object.keys(b).forEach((key) => {
            if (key === "confidence")
                return; // skip confidence
            const aVal = result[key] ?? 0;
            const bVal = b[key] ?? 0;
            result[key] = aVal + bVal;
        });
        return result;
    }
    /**
     * Normalize modifier to stay in valid ranges
     *
     * Clamp each dimension to [-0.3, +0.3] (soft influence)
     *
     * @private
     * @param {ContextModifier} modifier - Modified in place
     */
    normalizeModifier(modifier) {
        const MAX_DELTA = 0.3;
        Object.keys(modifier).forEach((key) => {
            if (key === "confidence")
                return;
            const value = modifier[key];
            if (typeof value === "number") {
                modifier[key] = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, value));
            }
        });
    }
    /**
     * Compute confidence in context modifier
     *
     * How certain are we in these modifiers?
     * - Good data (all sensors) = high confidence
     * - Sparse data (estimated) = low confidence
     *
     * @private
     * @param {Object} weatherData
     * @returns {number} Confidence 0-1
     */
    computeContextConfidence(weatherData) {
        let confidence = 0.7; // base confidence
        // All weather variables present = higher confidence
        const hasAllWeatherData = [
            weatherData.temperature,
            weatherData.precipitationIntensity,
            weatherData.cloudiness,
            weatherData.humidity,
            weatherData.visibility,
        ].every((v) => v !== undefined && v !== null);
        if (hasAllWeatherData) {
            confidence = 0.95;
        }
        return confidence;
    }
}
exports.contextModifierService = new ContextModifierService();
