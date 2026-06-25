import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useRecommendations } from "../context/RecommendationsContext";
import {
  AlbumGrid,
  ProgressBar,
  Modal,
} from "../components";
import type { Recommendation, RecommendationsResponse, GenreCollection, WeatherContext } from "../types";
import { parseApiError } from "../utils/helpers";

export default function Home() {
  const navigate = useNavigate();
  const { loading, user } = useAuth();
  const { setGenres } = useRecommendations();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Weather icon paths
  const WEATHER_ICONS = {
    condition: "/win98-icons/kodak_imaging-0.png",
    temperature: "/win98-icons/tree-0.png",
    humidity: "/win98-icons/tip.png",
    timeOfDay: "/win98-icons/clock-1.png",
    season: "/win98-icons/calendar-2.png",
  };

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
      } catch {
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
        () => {
          setError("Please enable location access to get recommendations");
          setLoadingRecommendations(false);
        }
      );
    } catch {
      setError("An error occurred");
      setLoadingRecommendations(false);
    }
  };

  const fetchRecommendationsAtLocation = async (latitude: number, longitude: number) => {
    try {
      // Fetch recommendations and weather in parallel
      const [recData, weatherData] = await Promise.all([
        apiClient.getRecommendations(latitude, longitude, user?.id),
        apiClient.getWeather(latitude, longitude)
      ]);
      
      setRecommendations(recData as RecommendationsResponse);
      setWeather(weatherData as unknown as WeatherContext);
    } catch (err: unknown) {
      setError(parseApiError(err) || "Failed to fetch music recommendations");
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const displayAlbums = (recommendations?.recommendations || recommendations?.tracks || []).slice(0, 10);

  // Sync genres to context when recommendations change
  useEffect(() => {
    if (recommendations?.genres && recommendations.genres.length > 0) {
      setGenres(recommendations.genres as GenreCollection[]);
    }
  }, [recommendations?.genres, setGenres]);

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

      {!loadingRecommendations && recommendations && (
        <>
          {/* Albums Modal */}
          <Modal
            title="Albums you might like today"
            onClose={() => {}}
            overlay={false}
            initialX={30}
            initialY={100}
            initialWidth={460}
            initialHeight="auto"
            showClose={false}
          >
            <AlbumGrid
              albums={(displayAlbums as Recommendation[])}
              onAlbumClick={(album) => {
                const spotifyUrl = ("spotifyUrl" in album && album.spotifyUrl)
                  ? album.spotifyUrl
                  : `https://open.spotify.com/search/${encodeURIComponent(`${album.artist} ${album.name}`)}`;
                window.open(spotifyUrl, "_blank");
              }}
              empty={displayAlbums.length === 0}
              emptyMessage="No albums to display"
            />
          </Modal>

          {/* Weather Modal */}
          <Modal
            title="Today's Weather"
            onClose={() => {}}
            overlay={false}
            initialX={900}
            initialY={100}
            initialWidth={400}
            initialHeight="auto"
            showClose={false}
          >
            <div className="p-4 flex flex-wrap gap-6">
              {/* Condition */}
              <div className="flex flex-col items-center text-center">
                <img src={WEATHER_ICONS.condition} alt="Condition" className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Condition</p>
                <p className="text-sm text-text-primary">{weather?.condition}</p>
              </div>

              {/* Temperature */}
              <div className="flex flex-col items-center text-center">
                <img src={WEATHER_ICONS.temperature} alt="Temperature" className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Temp</p>
                <p className="text-sm text-text-primary">{weather?.temp}°C</p>
              </div>

              {/* Humidity */}
              <div className="flex flex-col items-center text-center">
                <img src={WEATHER_ICONS.humidity} alt="Humidity" className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Humidity</p>
                <p className="text-sm text-text-primary">{weather?.humidity}%</p>
              </div>

              {/* Time of Day */}
              <div className="flex flex-col items-center text-center">
                <img src={WEATHER_ICONS.timeOfDay} alt="Time of Day" className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Time</p>
                <p className="text-sm text-text-primary capitalize">{weather?.timeOfDay || "N/A"}</p>
              </div>

              {/* Season */}
              <div className="flex flex-col items-center text-center">
                <img src={WEATHER_ICONS.season} alt="Season" className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Season</p>
                <p className="text-sm text-text-primary capitalize">{weather?.season || "N/A"}</p>
              </div>
            </div>
          </Modal>
        </>
      )}
    </main>
  );
}


