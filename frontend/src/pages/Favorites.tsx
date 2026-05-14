import { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import AlbumIcon from "../components/AlbumIcon";

interface Recommendation {
  id: string;
  name: string;
  artist: string;
  image: string;
  spotifyUrl: string;
}

interface Favorite {
  id: string;
  albumSpotifyId: string;
  albumName: string;
  artist: string;
  imageUrl: string;
  spotifyUrl: string;
  createdAt: string;
}

export default function Favorites() {
  const { loading } = useAuth();
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [surveyCount, setSurveyCount] = useState(0);
  const [tasteProfile, setTasteProfile] = useState<{ dominantThemes?: string[]; userType?: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null);

  useEffect(() => {
    handleLoadFavorites();
    loadSurveyStatus();
  }, []);

  const handleLoadFavorites = async () => {
    setLoadingFavorites(true);
    setError(null);

    try {
      console.log("❤️ Fetching favorites...");
      const favs = await apiClient.getFavorites();
      const albums = (favs as unknown as Favorite[]).map((fav: Favorite) => ({
        id: fav.albumSpotifyId,
        name: fav.albumName,
        artist: fav.artist,
        image: fav.imageUrl,
        spotifyUrl: fav.spotifyUrl,
      }));
      setFavorites(albums);
      console.log("🎵 Favorites received:", albums);
    } catch (err: unknown) {
      console.error("Failed to fetch favorites:", err);
      setError("Failed to load favorites");
    } finally {
      setLoadingFavorites(false);
    }
  };

  const loadSurveyStatus = async () => {
    try {
      const userProfile = await apiClient.getUserProfile();
      setSurveyCount(userProfile.surveyCount as number);
      
      // Try to load existing taste profile
      try {
        const profile = await apiClient.getTasteProfile();
        setTasteProfile(profile);
      } catch {
        // Profile doesn't exist yet
        setTasteProfile(null);
      }
    } catch (err) {
      console.error("Failed to load survey status:", err);
      setSurveyCount(0);
    }
  };

  const handleAnalyzeTaste = async () => {
    if (surveyCount < 10) {
      setAnalyzeMessage("❌ Need at least 10 surveys to analyze");
      setTimeout(() => setAnalyzeMessage(null), 3000);
      return;
    }

    setAnalyzing(true);
    try {
      console.log("🔬 Analyzing taste profile from surveys...");
      const result = await apiClient.analyzeTaste();
      console.log("✅ Taste analysis complete!", result);
      setTasteProfile(result);
      setAnalyzeMessage("✨ Your taste profile has been updated! Recommendations will now be personalized.");
      setTimeout(() => setAnalyzeMessage(null), 5000);
      
      // Reload survey status to show the completed analysis
      loadSurveyStatus();
    } catch (err) {
      console.error("Failed to analyze taste:", err);
      setAnalyzeMessage("❌ Failed to analyze taste. Please try again.");
      setTimeout(() => setAnalyzeMessage(null), 3000);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading || loadingFavorites) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-vinyl-tan)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        background: "var(--color-vinyl-tan)",
        overflow: "auto",
        padding: "16px",
        position: "relative",
      }}
    >
      {/* Survey Status & Analyze Button */}
      {surveyCount > 0 && (
        <Box sx={{ marginBottom: "16px", padding: "12px", background: "#dfdfdf", border: "1px solid #999", borderRadius: "2px" }}>
          {surveyCount >= 10 && !tasteProfile && (
            <button
              onClick={handleAnalyzeTaste}
              disabled={analyzing}
              style={{
                display: "inline-block",
                padding: "6px 12px",
                background: analyzing ? "#999" : "linear-gradient(180deg, #9B8CB8 0%, #7B5BA8 100%)",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
                border: "2px solid",
                borderColor: analyzing ? "#999" : "#7B5BA8 #5B3B8E #5B3B8E #7B5BA8",
                borderRadius: "3px",
                cursor: analyzing ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: analyzing ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!analyzing) {
                  (e.target as HTMLButtonElement).style.background = "linear-gradient(180deg, #9B8CB8 0%, #6B4B9E 100%)";
                }
              }}
              onMouseLeave={(e) => {
                if (!analyzing) {
                  (e.target as HTMLButtonElement).style.background = "linear-gradient(180deg, #9B8CB8 0%, #7B5BA8 100%)";
                }
              }}
            >
              {analyzing ? "Analyzing..." : "🔬 Analyze Your Taste"}
            </button>
          )}
          
          {tasteProfile && (
            <Box sx={{ fontSize: "11px", color: "#555", marginTop: "8px" }}>
              <Typography variant="caption" sx={{ display: "block", marginBottom: "4px", fontWeight: "bold" }}>
                ❤️ Your favorite recommendations
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {analyzeMessage && (
        <Box sx={{ marginBottom: "16px", padding: "12px", background: analyzeMessage.startsWith("✓") ? "#d4edda" : "#f8d7da", border: "1px solid #999", borderRadius: "2px", color: analyzeMessage.startsWith("✓") ? "#155724" : "#721c24" }}>
          <Typography variant="body2" sx={{ fontSize: "11px" }}>
            {analyzeMessage}
          </Typography>
        </Box>
      )}

      {error && (
        <Box sx={{ color: "red", marginBottom: "16px" }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      {favorites.length === 0 && !error && (
        <Box sx={{ color: "#666", marginTop: "32px", textAlign: "center" }}>
          <Typography variant="body2">No favorites yet. Start adding albums! ❤️</Typography>
        </Box>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
          gap: "16px",
          paddingBottom: "16px",
        }}
      >
        {favorites.map((album) => (
          <AlbumIcon
            key={album.id}
            name={album.name}
            artist={album.artist}
            image={album.image}
            onClick={() => {
              if (album.spotifyUrl) {
                window.open(album.spotifyUrl, "_blank");
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
