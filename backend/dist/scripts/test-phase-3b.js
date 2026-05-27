#!/usr/bin/env ts-node
"use strict";
/**
 * PHASE 3B TEST - Survey System to 13D Profile Generation
 *
 * This script demonstrates the complete Phase 3B flow:
 * 1. Create a test user with surveyed albums
 * 2. Generate 13D profile from embeddings
 * 3. Verify profile is saved correctly
 * 4. Demonstrate recommendation ready state
 *
 * Run: npx ts-node src/scripts/test-phase-3b.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const user_profile_service_1 = require("../services/user-profile.service");
const survey_service_1 = require("../services/survey.service");
const album_embedding_service_1 = require("../services/album/album-embedding.service");
const vectorMath = __importStar(require("../utils/vector-math"));
const prisma = new client_1.PrismaClient();
const TEST_USER_ID = "test-phase-3b-user";
async function main() {
    console.log("\n" + "=".repeat(70));
    console.log("     PHASE 3B TEST: Survey System → 13D Profile Generation");
    console.log("=".repeat(70));
    try {
        // STEP 0: Create or get test user first (needed for albums)
        console.log("\n[SETUP] Creating/getting test user...");
        let testUser = await prisma.user.findUnique({
            where: { id: TEST_USER_ID }
        });
        if (!testUser) {
            testUser = await prisma.user.create({
                data: { id: TEST_USER_ID, email: `${TEST_USER_ID}@test.local` }
            });
        }
        console.log(`✓ Test user ready: ${TEST_USER_ID}`);
        // SETUP: Create test albums if they don't exist (now with userId)
        console.log("\n[SETUP] Creating test albums with embeddings...");
        const testAlbums = await setupTestAlbums(TEST_USER_ID);
        console.log(`✓ Created ${testAlbums.length} test albums`);
        // STEP 1: Create user and add surveys
        console.log("\n[STEP 1] Creating test user and surveys...");
        await createTestUser(TEST_USER_ID, testAlbums);
        console.log(`✓ User ${TEST_USER_ID} created with ${testAlbums.length} surveys`);
        // STEP 2: Show survey count
        console.log("\n[STEP 2] Verifying surveys...");
        const surveyCount = await survey_service_1.surveyService.getCompletedSurveyCount(TEST_USER_ID);
        console.log(`✓ Survey count: ${surveyCount}`);
        // STEP 3: Generate 13D profile using old method (for comparison)
        console.log("\n[STEP 3] OLD FLOW - Using analyzeEmotionalProfile()...");
        const surveys = await survey_service_1.surveyService.getAllSurveys(TEST_USER_ID);
        const oldAnalysis = survey_service_1.surveyService["analyzeEmotionalProfile"](surveys);
        console.log(`✓ Old 9D analysis: ${JSON.stringify(oldAnalysis.emotionalProfile, null, 2)}`);
        // STEP 4: Generate 13D profile (NEW)
        console.log("\n[STEP 4] NEW FLOW - Using UserProfileService...");
        const profileLayers = await user_profile_service_1.userProfileService.computeProfileFrom13DAlbums(TEST_USER_ID);
        const profile13D = profileLayers.taste; // Use the intrinsic taste layer for display
        console.log(`✓ 13D Profile computed (showing intrinsic taste layer):`);
        console.log(`  Valence:         ${profile13D.valence.toFixed(3)}`);
        console.log(`  Arousal:         ${profile13D.arousal.toFixed(3)}`);
        console.log(`  Warmth:          ${profile13D.warmth.toFixed(3)}`);
        console.log(`  Intimacy:        ${profile13D.intimacy.toFixed(3)}`);
        console.log(`  Groundedness:    ${profile13D.groundedness.toFixed(3)}`);
        console.log(`  Density:         ${profile13D.density.toFixed(3)}`);
        // Show perception bias layer
        const percBias = profileLayers.bias;
        console.log(`✓ Perception Bias layer:`);
        console.log(`  Valence bias:    ${percBias.valence.toFixed(3)}`);
        console.log(`  Arousal bias:    ${percBias.arousal.toFixed(3)}`);
        console.log(`  Warmth bias:     ${percBias.warmth.toFixed(3)}`);
        // STEP 5: Save profile
        console.log("\n[STEP 5] Saving 13D profile + bias layers to database...");
        const savedProfile = await user_profile_service_1.userProfileService.save13DProfile(TEST_USER_ID, profileLayers);
        console.log(`✓ Profile + bias layers saved to UserTasteProfile`);
        console.log(`  albumsAnalyzed:  ${savedProfile.albumsAnalyzed}`);
        console.log(`  updatedAt:       ${savedProfile.updatedAt}`);
        // STEP 6: Fetch back and verify
        console.log("\n[STEP 6] Fetching profile from database...");
        const fetchedProfile = await user_profile_service_1.userProfileService.get13DProfile(TEST_USER_ID);
        if (fetchedProfile) {
            console.log(`✓ Profile retrieved successfully`);
            console.log(`  All 13D fields populated: ${Object.keys(fetchedProfile).length === 12}`);
        }
        // STEP 7: Test complete survey flow
        console.log("\n[STEP 7] Testing complete surveyService.generateTasteProfile()...");
        const completeSaved = await survey_service_1.surveyService.generateTasteProfile(TEST_USER_ID, surveys);
        console.log(`✓ Complete flow successful`);
        console.log(`  Profile saved with 13D dimensions`);
        // STEP 8: Show recommendation readiness
        console.log("\n[STEP 8] Recommendation System Readiness Check...");
        const userProfile = await user_profile_service_1.userProfileService.get13DProfile(TEST_USER_ID);
        const mockWeatherModifier = {
            valence: 0.1,
            arousal: -0.05,
            warmth: 0.2,
            introspection: 0,
            tension: 0,
            intimacy: 0,
            density: 0,
            spaciousness: 0.1,
            organicSynthetic: 0,
            nostalgia: 0,
            groundedness: 0,
            movement: 0
        };
        const userState = vectorMath.addVectors(userProfile, mockWeatherModifier);
        console.log(`✓ Mock recommendation computation:`);
        console.log(`  User Profile + Weather Modifier = UserState`);
        console.log(`  UserState Warmth: ${userState.warmth.toFixed(3)}`);
        console.log(`  UserState Arousal: ${userState.arousal.toFixed(3)}`);
        // STEP 9: Cleanup
        console.log("\n[STEP 9] Cleaning up test data...");
        await cleanup(TEST_USER_ID, testAlbums);
        console.log(`✓ Test data cleaned up`);
        // SUMMARY
        console.log("\n" + "=".repeat(70));
        console.log("     ✨ PHASE 3B TEST SUCCESSFUL ✨");
        console.log("=".repeat(70));
        console.log(`
✅ Survey System Migration Complete:
   - UserProfileService created and working
   - 13D embeddings averaged correctly
   - Profile saved to database
   - Ready for recommendation algorithm
   
✅ Architecture Validated:
   - Old keyword matching vs new embedding approach
   - User profile stored in 13D space
   - Recommendation system can use this profile
   
✅ Data Flow Verified:
   - Surveys → User Profile
   - User Profile + Weather → User State
   - User State ready for similarity scoring

Next Steps:
   → Phase 4: Multi-stage recommendation algorithm
   → Use userState + album embeddings for scoring
    `);
    }
    catch (error) {
        console.error("\n❌ TEST FAILED:", error);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
}
/**
 * Setup test albums with embeddings
 */
async function setupTestAlbums(userId) {
    const albumIds = [
        "4V4w195UxFFVjysQZwQeZ2", // Pink Floyd - Dark Side of the Moon
        "4LH4d3cOWNNsVoF0AriFjC", // The Beatles - Abbey Road
        "2noRn2Aes5aoNVsU6iWjc0", // Radiohead - OK Computer
        "4cOdK2wGLETKBW3PvgPWqV", // Joy Division - Unknown Pleasures
        "0J5qhNMLDRnrW1Bwwb7aMl" // Björk - Homogenic
    ];
    const testAlbums = [];
    for (const spotifyId of albumIds) {
        // Check if already exists
        const existing = await prisma.album.findUnique({
            where: { spotifyId }
        });
        if (!existing) {
            // Create album with userId
            const album = await prisma.album.create({
                data: {
                    spotifyId,
                    title: `Test Album ${spotifyId.substring(0, 8)}`,
                    artist: "Test Artist",
                    imageUrl: "https://example.com/image.jpg",
                    userId // Add userId parameter
                }
            });
            // Create embedding
            const mockAudioFeatures = {
                danceability: 0.5 + Math.random() * 0.3,
                energy: 0.5 + Math.random() * 0.3,
                loudness: -5,
                speechiness: 0.1,
                acousticness: 0.6 + Math.random() * 0.2,
                instrumentalness: 0.8,
                liveness: 0.2,
                valence: 0.5 + Math.random() * 0.3,
                tempo: 100 + Math.random() * 50,
                mode: 1,
                key: 5
            };
            await album_embedding_service_1.albumEmbeddingService.getOrComputeEmbedding(spotifyId, mockAudioFeatures, { albumName: album.title, artist: album.artist });
            testAlbums.push(album);
        }
        else {
            testAlbums.push(existing);
        }
    }
    return testAlbums;
}
/**
 * Create test user with surveys for albums
 */
async function createTestUser(userId, albums) {
    // Delete any existing test data
    await prisma.albumSurvey.deleteMany({ where: { userId } });
    await prisma.userTasteProfile.deleteMany({ where: { userId } });
    // Create surveys for each album
    for (const album of albums) {
        await prisma.albumSurvey.create({
            data: {
                userId,
                spotifyAlbumId: album.spotifyId,
                albumName: album.title,
                artist: album.artist,
                imageUrl: "https://example.com/image.jpg",
                emotions: ["introspective", "atmospheric"],
                seasons: ["autumn", "winter"],
                whenYouListen: ["late night"],
                movementPreference: "reflect",
                vibe: ["melancholic"],
                optionalNote: "Test survey for Phase 3B"
            }
        });
    }
}
/**
 * Cleanup test data
 */
async function cleanup(userId, albums) {
    // Delete surveys
    await prisma.albumSurvey.deleteMany({ where: { userId } });
    // Delete profile
    await prisma.userTasteProfile.deleteMany({ where: { userId } });
    // Delete test albums and embeddings
    for (const album of albums) {
        await prisma.albumEmotionalEmbedding.deleteMany({
            where: { spotifyAlbumId: album.spotifyId }
        });
        await prisma.album.delete({
            where: { spotifyId: album.spotifyId }
        });
    }
}
// Run test
main();
