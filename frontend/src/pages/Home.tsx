import { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useRecommendations } from "../context/RecommendationsContext";
import AlbumIcon from "../components/AlbumIcon";
import { OnboardingSurveyWizard } from "../components/OnboardingSurveyWizard";
import { OnboardingSuccessScreen } from "../components/OnboardingSuccessScreen";

interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  spotifyUrl?: string;
}

interface Recommendation {
  id: string;
  name: string;
  artist: string;
  image: string;
  spotifyUrl: string;
}

interface GenreCollection {
  name: string;
  albums: Recommendation[];
}

interface RecommendationsData {
  mood?: string;
  weather?: {
    condition: string;
    temp: number;
    humidity: number;
  };
  recommendations?: Recommendation[];
  genres?: GenreCollection[];
  tracks?: Recommendation[];
}

export default function Home() {
  const { loading, user } = useAuth();
  const { genres, setGenres, currentView } = useRecommendations();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedAlbums, setSavedAlbums] = useState<Album[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user needs onboarding
  useEffect(() => {
    if (loading) return; // Wait for auth check

    const checkOnboarding = async () => {
      try {
        setLoadingProfile(true);
        const profile = await apiClient.getUserProfile();

        if (profile.needsOnboarding && !profile.profileGenerated && profile.surveyCount === 0) {
          // Brand new user: fetch their saved albums
          try {
            const albumsResponse = await apiClient.getAvailableAlbumsForSurvey();
            const albums = (albumsResponse.albums as Album[]) || [];
            setSavedAlbums(albums);
            setShowWizard(true);
          } catch (err) {
            setError("Failed to load your saved albums. Please try again.");
            setShowWizard(true);
          }
        } else {
          // User has profile or is returning - skip wizard
          setShowWizard(false);
          handleGetRecommendations();
        }
      } catch (err) {
        // If profile check fails, default to showing home
        setShowWizard(false);
        handleGetRecommendations();
      } finally {
        setLoadingProfile(false);
      }
    };

    checkOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleGetRecommendations = async () => {
    setLoadingRecommendations(true);
    setError(null);

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          await fetchRecommendationsAtLocation(latitude, longitude);
        },
        (_err) => {
          setError("Please enable location access to get recommendations");
          setLoadingRecommendations(false);
        }
      );
    } catch (_err) {
      setError("An error occurred");
      setLoadingRecommendations(false);
    }
  };

  const fetchRecommendationsAtLocation = async (latitude: number, longitude: number) => {
    try {
      const data = await apiClient.getRecommendations(latitude, longitude, user?.id);
      setRecommendations(data);
    } catch (err: unknown) {
      let errorMsg = "Failed to fetch music recommendations";
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as Record<string, unknown>;
        const response = error.response as Record<string, unknown>;
        const data = response?.data as Record<string, unknown>;
        if (data?.error) {
          errorMsg = String(data.error);
        } else if ('message' in error) {
          errorMsg = `Error: ${error.message}`;
        }
      } else if (err instanceof Error) {
        errorMsg = `Error: ${err.message}`;
      }
      setError(errorMsg);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const displayAlbums = (recommendations?.recommendations || recommendations?.tracks || []).slice(0, 20);
  const displayGenres = recommendations?.genres || [];

  // Sync genres to context when recommendations change
  useEffect(() => {
    if (displayGenres.length > 0) {
      setGenres(displayGenres);
    }
  }, [displayGenres, setGenres]);

  // Get albums to display based on current view
  const getDisplayAlbums = () => {
    if (typeof currentView === "string" && currentView === "picks") {
      return displayAlbums;
    } else if (typeof currentView === "object" && currentView.type === "genre") {
      // Use genres from context which is synced from recommendations
      return genres[currentView.index]?.albums || [];
    }
    return [];
  };

  // Show loading while checking auth and profile
  if (loading || loadingProfile) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#A89080",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  // Show onboarding wizard for new users
  if (showWizard) {
    return (
      <OnboardingSurveyWizard
        albums={savedAlbums}
        onComplete={() => {
          setShowWizard(false);
          setShowSuccess(true);
        }}
        onSkip={() => {
          setShowWizard(false);
          handleGetRecommendations();
        }}
      />
    );
  }

  // Show success screen after profile is created
  if (showSuccess) {
    return (
      <OnboardingSuccessScreen
        onContinue={() => {
          setShowSuccess(false);
          handleGetRecommendations();
        }}
      />
    );
  }

  // Normal home page (for returning users or after onboarding)
  return (
    <Box
      sx={{
        height: "100%",
        background: "#A89080",
        overflow: "auto",
        padding: "16px",
        position: "relative",
      }}
    >
      {error && (
        <Box sx={{ color: "red", marginBottom: "16px" }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      {loadingRecommendations && (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ color: "#fff" }} />
        </Box>
      )}

      {!loadingRecommendations && (
        <>
          {recommendations?.weather && (
            <Box sx={{ marginBottom: "16px", color: "#333" }}>
              <Typography variant="caption">
                🌤️ {recommendations.weather.condition} - {recommendations.weather.temp}°C - {recommendations.mood}
              </Typography>
            </Box>
          )}

          {/* Display current view's albums */}
          {typeof currentView === "string" && currentView === "picks" && (
            <Typography variant="subtitle2" sx={{ marginBottom: "12px", color: "#333", fontWeight: "bold" }}>
              Today's Picks in {recommendations?.weather?.condition}
            </Typography>
          )}
          {typeof currentView === "object" && currentView.type === "genre" && (
            <Typography variant="subtitle2" sx={{ marginBottom: "12px", color: "#333", fontWeight: "bold" }}>
              {genres[currentView.index]?.name.charAt(0).toUpperCase() + genres[currentView.index]?.name.slice(1)}
            </Typography>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
              gap: "16px",
              paddingBottom: "16px",
            }}
          >
            {getDisplayAlbums().map((album) => (
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
        </>
      )}
    </Box>
  );
}

