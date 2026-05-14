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
/**
 * Context Modifier Service
 *
 * Computes additive emotional modifiers from weather and temporal context.
 *
 * @class ContextModifierService
 */
class ContextModifierService {
    /**
     * Compute context modifier from weather and time
     *
     * MULTI-VARIABLE APPROACH:
     * Instead of single categories ("rainy", "sunny"), combine:
     * - Temperature (continuous)
     * - Precipitation intensity (continuous)
     * - Cloudiness (continuous)
     * - Humidity (continuous)
     * - Visibility (continuous)
     * - Time of day (categorical but meaningful)
     * - Season (categorical)
     *
     * Each variable contributes small additive deltas.
     * Modifiers stay in [-0.3, +0.3] range (soft influence, not override).
     *
     * STRATEGY:
     * 1. Parse each weather variable
     * 2. Generate mini-modifier for each
     * 3. Sum them (multiple factors compound)
     * 4. Compute overall confidence
     * 5. Normalize to valid range
     *
     * @async
     * @param {Object} weatherData - Current weather conditions
     * @param {number} weatherData.temperature - Celsius (-60 to +60 typical)
     * @param {number} weatherData.precipitationIntensity - 0 (none) to 1 (heavy rain)
     * @param {number} weatherData.cloudiness - 0 (clear) to 1 (overcast)
     * @param {number} weatherData.humidity - 0-100%
     * @param {number} weatherData.visibility - kilometers
     * @param {"morning"|"afternoon"|"evening"|"night"} weatherData.timeOfDay
     * @param {"spring"|"summer"|"autumn"|"winter"} weatherData.season
     *
     * @returns {Promise<ContextModifier>} Additive modifiers (deltas)
     *
     * @example
     * const modifier = await contextModifierService.computeContextModifier({
     *   temperature: 5,
     *   precipitationIntensity: 0.8,
     *   cloudiness: 0.9,
     *   humidity: 85,
     *   visibility: 2,
     *   timeOfDay: "evening",
     *   season: "winter"
     * });
     * // Result: { warmth: +0.15, introspection: +0.25, movement: -0.10, ... }
     */
    async computeContextModifier(weatherData) {
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
        const precipModifiers = this.computePrecipitationModifiers(weatherData.precipitationIntensity);
        Object.assign(modifier, this.addModifiers(modifier, precipModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // CLOUDINESS EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const cloudModifiers = this.computeCloudModifiers(weatherData.cloudiness);
        Object.assign(modifier, this.addModifiers(modifier, cloudModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // TIME OF DAY EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const timeModifiers = this.computeTimeOfDayModifiers(weatherData.timeOfDay);
        Object.assign(modifier, this.addModifiers(modifier, timeModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // SEASONAL EFFECTS
        // ─────────────────────────────────────────────────────────────────────
        const seasonModifiers = this.computeSeasonalModifiers(weatherData.season);
        Object.assign(modifier, this.addModifiers(modifier, seasonModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // COMPOUND INTERACTIONS
        // ─────────────────────────────────────────────────────────────────────
        // Some effects compound (e.g., cold + rainy is more introspective than either alone)
        const compoundModifiers = this.computeCompoundInteractions(weatherData);
        Object.assign(modifier, this.addModifiers(modifier, compoundModifiers));
        // ─────────────────────────────────────────────────────────────────────
        // NORMALIZE & CLAMP
        // ─────────────────────────────────────────────────────────────────────
        this.normalizeModifier(modifier);
        // Compute overall confidence
        modifier.confidence = this.computeContextConfidence(weatherData);
        return modifier;
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
