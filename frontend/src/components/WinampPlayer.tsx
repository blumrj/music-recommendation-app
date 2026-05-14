import { useState, useEffect } from "react";
import { Box, Typography, LinearProgress, CircularProgress } from "@mui/material";
import axios from "axios";
import { apiClient } from "../services/api";
import { ExperientialSurveyModal } from "./ExperientialSurveyModal";

interface Track {
  id: string;
  name: string;
  artist: string;
  duration: number;
  previewUrl: string | null;
}

interface AudioFeatures {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
}

interface WinampPlayerProps {
  albumId: string;
  albumName: string;
  artist: string;
  image: string;
  spotifyToken: string;
  spotifyUrl: string;
}

interface AudioFeatureGaugeProps {
  label: string;
  value: number;
  color: string;
}

interface FavoriteData {
  id: string;
  albumSpotifyId: string;
  albumName: string;
  artist: string;
  imageUrl: string;
  spotifyUrl: string;
  createdAt: string;
}

const AudioFeatureGauge = ({ label, value, color }: AudioFeatureGaugeProps) => {
  const percentage = value * 100;
  
  const emotionLabel = (label: string, value: number): string => {
    if (label === "Energy") return value > 0.6 ? "Energetic" : value > 0.3 ? "Moderate" : "Calm";
    if (label === "Danceability") return value > 0.6 ? "Very Danceable" : value > 0.3 ? "Somewhat Danceable" : "Not Danceable";
    if (label === "Positivity") return value > 0.6 ? "Happy" : value > 0.3 ? "Neutral" : "Melancholic";
    if (label === "Acousticness") return value > 0.6 ? "Acoustic" : value > 0.3 ? "Balanced" : "Electronic";
    return "";
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography sx={{ fontSize: "11px", fontWeight: "bold" }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: "10px", color: "#555" }}>
          {emotionLabel(label, value)}
        </Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={percentage}
        sx={{
          height: 6,
          backgroundColor: "#dfdfdf",
          "& .MuiLinearProgress-bar": {
            backgroundColor: color,
          },
        }}
      />
    </Box>
  );
};

const WinampPlayer = ({
  albumId,
  albumName,
  artist,
  image,
  spotifyToken,
  spotifyUrl,
}: WinampPlayerProps) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [albumFeatures, setAlbumFeatures] = useState<AudioFeatures | null>(null);
  const [albumDescription, setAlbumDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [wasJustAdded, setWasJustAdded] = useState(false);

  // Fetch album details from Spotify
  useEffect(() => {
    const fetchAlbumDetails = async () => {
      if (!albumId || !spotifyToken) {
        setError("Missing album ID or Spotify token");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const albumResponse = await axios.get(
          `https://api.spotify.com/v1/albums/${albumId}`,
          {
            headers: { Authorization: `Bearer ${spotifyToken}` },
          }
        );

        const albumData = albumResponse.data;
        
        setGenres(albumData.genres || []);

        // Build album description
        const releaseYear = albumData.release_date?.split('-')[0] || 'Unknown';
        const totalTracks = albumData.total_tracks || 0;
        const label = albumData.copyrights?.[0]?.text || '';
        const description = `Released in ${releaseYear} • ${totalTracks} tracks${label ? ' • ' + label : ''}`;
        setAlbumDescription(description);

        const trackList: Track[] = (albumData.tracks.items as Array<{id: string; name: string; artists: Array<{name: string}>; duration_ms: number; preview_url: string | null}>).map((track) => ({
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown",
          duration: track.duration_ms / 1000,
          previewUrl: track.preview_url,
        }));

        setTracks(trackList);

        // Fetch audio features for first track with preview
        const trackWithPreview = trackList.find(t => t.previewUrl);
        if (trackWithPreview) {
          try {
            const featuresResponse = await axios.get(
              `https://api.spotify.com/v1/audio-features/${trackWithPreview.id}`,
              {
                headers: { Authorization: `Bearer ${spotifyToken}` },
              }
            );

            setAlbumFeatures({
              energy: featuresResponse.data.energy,
              danceability: featuresResponse.data.danceability,
              valence: featuresResponse.data.valence,
              acousticness: featuresResponse.data.acousticness,
            });
          } catch (error) {
            // Could not fetch audio features
          }
        }

        if (trackList.length === 0) {
          setError("No tracks found in this album");
        }

        setLoading(false);
      } catch (error: unknown) {
        const errorMsg = axios.isAxiosError(error)
          ? `Error: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`
          : "Error loading album. Please try again.";
        
        setError(errorMsg);
        setLoading(false);
      }
    };

    fetchAlbumDetails();
  }, [albumId, spotifyToken]);

  // Check if album is in favorites
  useEffect(() => {
    const checkIfSaved = async () => {
      try {
        const favorites = await apiClient.getFavorites();
        const isFavorited = (favorites as unknown as FavoriteData[]).some((fav) => fav.albumSpotifyId === albumId);
        setIsSaved(isFavorited);
      } catch (error) {
        // Could not check favorites
      }
    };

    if (albumId) {
      checkIfSaved();
    }
  }, [albumId]);

  // Player will automatically update when track URL changes
  // (No manual reset needed)

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveFavorite = async () => {
    setSavingFavorite(true);
    try {
      if (isSaved) {
        // Remove from favorites
        await apiClient.removeFavorite(albumId);
        setIsSaved(false);
        setWasJustAdded(false);
      } else {
        // Add to favorites
        await apiClient.saveFavorite({
          albumSpotifyId: albumId,
          albumName,
          artist,
          imageUrl: image,
          spotifyUrl,
        });
        setIsSaved(true);
        setWasJustAdded(true);
        // Show survey modal after a short delay
        setTimeout(() => {
          setShowSurveyModal(true);
        }, 300);
      }
    } catch (error) {
      // Error saving favorite
    } finally {
      setSavingFavorite(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", background: "#c0c0c0", p: 2 }}>
        <Typography sx={{ fontSize: "14px", fontWeight: "bold", mb: 1, color: "#c00000" }}>
          ⚠ Error Loading Album
        </Typography>
        <Typography sx={{ fontSize: "12px", color: "#555", textAlign: "center", mb: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto", background: "#c0c0c0" }}>
        {/* Album Header */}
        <Box sx={{ display: "flex", gap: 2, p: 2, borderBottom: "2px solid #dfdfdf" }}>
        <Box
          sx={{
            flex: 0,
            minWidth: "150px",
            width: "150px",
            aspectRatio: "1",
            backgroundImage: `url('${image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "2px solid #888",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        />

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: "14px", fontWeight: "bold", mb: 0.5 }}>
            {albumName}
          </Typography>
          <Typography sx={{ fontSize: "12px", color: "#555", mb: 1.5 }}>
            by {artist}
          </Typography>

          {/* Open in Spotify Button + Save Button */}
          <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
            <Box
              onClick={() => window.open(spotifyUrl, "_blank")}
              sx={{
                display: "inline-block",
                px: 2,
                py: 0.5,
                background: "#1DB954",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "bold",
                border: "2px solid #1ed760",
                borderRadius: "3px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s ease",
                flex: 1,
                "&:hover": {
                  background: "#1ed760",
                  boxShadow: "0 2px 6px rgba(30, 215, 96, 0.4)"
                },
                "&:active": {
                  transform: "scale(0.98)"
                }
              }}
            >
              🎵 Open in Spotify
            </Box>

            {/* Save to Favorites Button */}
            <Box
              onClick={handleSaveFavorite}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                px: 1.5,
                py: 0.5,
                background: isSaved ? "#ff6b6b" : "linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)",
                color: isSaved ? "#fff" : "#000",
                fontSize: "16px",
                fontWeight: "bold",
                border: "2px solid",
                borderColor: isSaved ? "#ff6b6b" : "#dfdfdf #808080 #808080 #dfdfdf",
                borderRadius: "3px",
                cursor: savingFavorite ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: savingFavorite ? 0.6 : 1,
                minWidth: "50px",
                "&:hover": {
                  background: isSaved ? "#ff5252" : "linear-gradient(180deg, #e8e8e8 0%, #c8c8c8 100%)",
                }
              }}
              title={isSaved ? "Remove from favorites" : "Add to favorites"}
            >
              {isSaved ? "💚" : "🤍"}
            </Box>
          </Box>

          {genres.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography sx={{ fontSize: "11px", fontWeight: "bold", mb: 0.5 }}>
                Genres
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {genres.slice(0, 3).map((genre, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      px: 1,
                      py: 0.25,
                      background: "#0a246a",
                      color: "#fff",
                      fontSize: "10px",
                      borderRadius: "3px",
                      textTransform: "capitalize",
                    }}
                  >
                    {genre}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

        </Box>
      </Box>

      {/* About Album Section */}
      <Box sx={{ p: 2, borderBottom: "2px solid #dfdfdf", background: "#dfdfdf" }}>
        <Typography sx={{ fontSize: "11px", fontWeight: "bold", mb: 1 }}>
          About Album
        </Typography>
        <Typography sx={{ fontSize: "10px", color: "#555", lineHeight: 1.6 }}>
          {albumDescription}
        </Typography>

        {albumFeatures && (
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{ fontSize: "11px", fontWeight: "bold", mb: 1 }}>
              Mood & Vibe
            </Typography>
            <AudioFeatureGauge label="Energy" value={albumFeatures.energy} color="#ff6b6b" />
            <AudioFeatureGauge label="Danceability" value={albumFeatures.danceability} color="#4ecdc4" />
            <AudioFeatureGauge label="Positivity" value={albumFeatures.valence} color="#ffd93d" />
            <AudioFeatureGauge label="Acousticness" value={albumFeatures.acousticness} color="#95a3a3" />
          </Box>
        )}
      </Box>

      {/* Track List */}
      <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
        <Typography sx={{ fontSize: "11px", fontWeight: "bold", mb: 1, px: 1 }}>
          {tracks.length} Tracks
        </Typography>
        {tracks.map((track, idx) => (
          <Box
            key={track.id}
            sx={{
              p: 1,
              mb: 0.5,
              background: idx % 2 === 0 ? "#dfdfdf" : "#c0c0c0",
              color: "#000",
              border: "1px solid #999",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "10px", fontWeight: "bold", minWidth: "25px", color: "#666" }}>
                {idx + 1}
              </Typography>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: "11px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {track.name}
                </Typography>
                <Typography sx={{ fontSize: "9px", color: "#666" }}>
                  {track.artist}
                </Typography>
              </Box>
            </Box>
            <Typography sx={{ fontSize: "10px", ml: 1, flexShrink: 0, color: "#666" }}>
              {formatTime(track.duration)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>

    {/* Album Survey Modal - shows after adding to favorites */}
    {wasJustAdded && (
      <ExperientialSurveyModal
        album={{
          spotifyId: albumId,
          name: albumName,
          artist,
          imageUrl: image,
        }}
        isOpen={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        onSurveyComplete={() => {
          setShowSurveyModal(false);
        }}
      />
    )}
    </>
  );
};

export default WinampPlayer;
