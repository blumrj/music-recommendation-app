/**
 * Quick test to verify Last.fm API key works
 * Run with: npx ts-node test-lastfm-api.ts
 */

import axios from "axios";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY || "56d2b753dc448f94d818d5a7d66e4ba9";

async function testLastfmApi() {
  console.log("Testing Last.fm API key...\n");

  try {
    // Test 1: Simple artist that definitely exists
    console.log("Test 1: cher (should exist in Last.fm)");
    let response = await axios.get("https://www.last.fm/2.0/", {
      params: {
        method: "artist.getTopTags",
        artist: "cher",
        api_key: LASTFM_API_KEY,
        format: "json"
      }
    });
    
    console.log("✓ Response status:", response.status);
    console.log("✓ Got tags:", response.data?.toptags?.tag?.slice(0, 3).map((t: any) => t.name));
    console.log("");

    // Test 2: The National with autocorrect
    console.log("Test 2: The National (with autocorrect)");
    response = await axios.get("https://www.last.fm/2.0/", {
      params: {
        method: "artist.getTopTags",
        artist: "The National",
        autocorrect: 1,
        api_key: LASTFM_API_KEY,
        format: "json"
      }
    });
    
    console.log("✓ Response status:", response.status);
    console.log("✓ Got tags:", response.data?.toptags?.tag?.slice(0, 3).map((t: any) => t.name));
    console.log("");

    // Test 3: Album search
    console.log("Test 3: Trouble Will Find Me album");
    response = await axios.get("https://www.last.fm/2.0/", {
      params: {
        method: "album.getTopTags",
        artist: "The National",
        album: "Trouble Will Find Me",
        autocorrect: 1,
        api_key: LASTFM_API_KEY,
        format: "json"
      }
    });
    
    console.log("✓ Response status:", response.status);
    console.log("✓ Got tags:", response.data?.toptags?.tag?.slice(0, 3).map((t: any) => t.name));

  } catch (error: any) {
    console.error("✗ Error:", error.message);
    console.error("Status:", error.response?.status);
    console.error("Response:", error.response?.data);
  }
}

testLastfmApi();
