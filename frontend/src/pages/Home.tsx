import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useRecommendations } from "../context/RecommendationsContext";
import {
  AlbumGrid,
  ProgressBar,
} from "../components";
import type { Recommendation, RecommendationsResponse, GenreCollection } from "../types";
import { parseApiError } from "../utils/helpers";

export default function Home() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const { genres, setGenres, currentView } = useRecommendations();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user needs onboarding on first load
  useEffect(() => {
    if (loading) return;

    const checkOnboarding = async () => {
      try {
        const profile = await apiClient.getUserProfile();
        
        // If user needs onboarding, redirect to onboarding page
        if (profile.needsOnboarding && !profile.profileGenerated && profile.surveyCount === 0) {
          navigate("/onboarding", { replace: true });
          return;
        }

        setLoadingProfile(false);
        // Auto-fetch recommendations for returning users
        handleGetRecommendations();
      } catch (err) {
        // If profile check fails, just continue to home
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
      setRecommendations(data as RecommendationsResponse);
    } catch (err: unknown) {
      setError(parseApiError(err) || "Failed to fetch music recommendations");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const displayAlbums = (recommendations?.recommendations || recommendations?.tracks || []).slice(0, 20);
  const displayGenres = recommendations?.genres || [];

  // Sync genres to context when recommendations change
  useEffect(() => {
    if (displayGenres.length > 0) {
      setGenres(displayGenres as GenreCollection[]);
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
      <main className="h-full overflow-auto relative bg-secondary p-md">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <ProgressBar indeterminate label="Loading recommendations..." width="200px" />
        </div>
      </main>
    );
  }

  // Normal home page - show recommendations
  return (
    <main className="h-full overflow-auto relative bg-secondary p-md">
      {error && (
        <div className="p-4 bg-[#f8d7da] border border-[#999] rounded mb-4">
          <p className="text-tension text-xs font-bold mb-2">❌ {error}</p>
          <button onClick={handleGetRecommendations} className="button px-3 py-1 text-xs">
            Retry
          </button>
        </div>
      )}

      {loadingRecommendations && (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <ProgressBar indeterminate label="Fetching recommendations..." width="200px" />
        </div>
      )}

      {!loadingRecommendations && (
        <>
          {recommendations?.weather && (
            <div className="mb-md text-text-secondary">
              <span className="text-sm">
                🌤️ {recommendations.weather.condition} - {recommendations.weather.temp}°C
              </span>
            </div>
          )}
        </>
      )}

      {recommendations && (
        <AlbumGrid
          albums={(getDisplayAlbums() as Recommendation[])}
          onAlbumClick={(album) => {
            const spotifyUrl = "spotifyUrl" in album ? album.spotifyUrl : "";
            if (spotifyUrl) {
              window.open(spotifyUrl, "_blank");
            }
          }}
          empty={getDisplayAlbums().length === 0}
          emptyMessage="No albums to display"
        />
      )}
    </main>
  );
}


