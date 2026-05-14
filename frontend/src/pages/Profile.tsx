import { useState, useEffect } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import XPWindow from "../components/XPWindow";

interface TasteProfile {
  valence: number;
  arousal: number;
  tension: number;
  warmth: number;
  intimacy: number;
  density: number;
  groundedness: number;
  albumsAnalyzed?: number;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  profileGenerated: boolean;
  surveyCount: number;
  needsOnboarding: boolean;
  readyForAnalysis: boolean;
  tasteProfile: TasteProfile | null;
}

const emotionalDimensions = [
  { key: "valence", label: "Positivity", description: "Cheerful and uplifting vs melancholic", color: "#FFD700" },
  { key: "arousal", label: "Energy", description: "Stimulating and intense vs calm and peaceful", color: "#FF6B35" },
  { key: "tension", label: "Tension", description: "Tense and anxious vs relaxed and resolved", color: "#E85D7B" },
  { key: "warmth", label: "Warmth", description: "Cozy and inviting vs cold and distant", color: "#FF8C42" },
  { key: "intimacy", label: "Intimacy", description: "Vulnerable and personal vs grand and epic", color: "#C792B8" },
  { key: "density", label: "Density", description: "Rich and layered vs sparse and minimal", color: "#5A7D8C" },
  { key: "groundedness", label: "Groundedness", description: "Concrete and real vs abstract and escapist", color: "#8B4513" },
];

export default function Profile() {
  const { loading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [surveyedAlbums, setSurveyedAlbums] = useState<any[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (loading) return;

    const fetchProfile = async () => {
      try {
        const [profileData, albumsData] = await Promise.all([
          apiClient.getUserProfile(),
          apiClient.getSurveyedAlbums(),
        ]);
        setProfile(profileData as unknown as UserProfile);
        setSurveyedAlbums((albumsData as Record<string, any>).albums || []);
      } catch (err: unknown) {
        let errorMsg = "Failed to load profile";
        if (err && typeof err === "object" && "response" in err) {
          const error = err as Record<string, unknown>;
          const response = error.response as Record<string, unknown>;
          const data = response?.data as Record<string, unknown>;
          if (data?.error) {
            errorMsg = String(data.error);
          }
        }
        setError(errorMsg);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [loading]);

  if (loading || loadingProfile) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7BA8A8",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box
        sx={{
          height: "100%",
          background: "var(--color-vinyl-tan)",
          overflow: "auto",
          padding: "16px",
        }}
      >
        <XPWindow title="Profile" onClose={() => {}} onFocus={() => {}}>
          <Box sx={{ p: 2, color: "red" }}>
            <Typography>{error || "Profile not found"}</Typography>
          </Box>
        </XPWindow>
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
      }}
    >
      {/* Profile Info - Main Content */}
      {error || !profile ? (
        <Box sx={{ color: "red", fontSize: "12px" }}>
          <Typography>{error || "Profile not found"}</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%" }}>
          {/* Analyze Profile Button - Show when profile not generated but surveys completed */}
          {!profile.profileGenerated && profile.surveyCount >= 5 && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                background: '#e8dcc8',
                border: '2px solid',
                borderColor: '#ffffff #808080 #808080 #ffffff',
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  mb: 1,
                  color: '#333',
                }}
              >
                Ready to generate your taste profile!
              </Typography>
              <Typography
                sx={{
                  fontSize: '12px',
                  mb: 1.5,
                  color: '#555',
                }}
              >
                You've completed {profile.surveyCount} surveys. Analyze them to create your emotional profile.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={async () => {
                  setIsAnalyzing(true);
                  try {
                    await apiClient.analyzeTaste();
                    // Refresh profile to show updated status
                    const updatedProfile = await apiClient.getUserProfile();
                    setProfile(updatedProfile as unknown as UserProfile);
                    setError(null);
                  } catch (err) {
                    setError('Failed to analyze profile. Please try again.');
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing}
                sx={{
                  fontSize: '11px',
                  textTransform: 'none',
                  padding: '6px 16px',
                  backgroundColor: '#7B5BA8',
                  color: '#fff',
                  border: '2px solid',
                  borderColor: '#ffffff #4a3866 #4a3866 #ffffff',
                  fontWeight: 'bold',
                  '&:hover:not(:disabled)': {
                    backgroundColor: '#9b7bc8',
                  },
                  '&:disabled': {
                    backgroundColor: '#7B5BA8',
                    color: '#ccc',
                  },
                }}
              >
                {isAnalyzing ? 'Analyzing...' : '✓ Analyze Profile Now'}
              </Button>
            </Box>
          )}

          {/* Your Profile Section */}
          <Box sx={{ mb: 3, p: 2, background: "#f5f5f5", border: "1px solid #ccc" }}>
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: "bold",
                mb: 1,
                color: "#333",
              }}
            >
              Your Profile
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, fontSize: "11px" }}>
              <Box>
                <Typography sx={{ fontWeight: "bold", color: "#666" }}>Name:</Typography>
                <Typography sx={{ color: "#333" }}>{profile.name}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: "bold", color: "#666" }}>Email:</Typography>
                <Typography sx={{ color: "#333" }}>{profile.email}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: "bold", color: "#666" }}>Profile Created:</Typography>
                <Typography sx={{ color: "#333" }}>{new Date(profile.createdAt).toLocaleDateString()}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: "bold", color: "#666" }}>Albums Analyzed:</Typography>
                <Typography sx={{ color: "#333" }}>{profile.tasteProfile?.albumsAnalyzed || 0}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: "bold", color: "#666" }}>Surveys Completed:</Typography>
                <Typography sx={{ color: "#333" }}>{profile.surveyCount}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: "bold", color: "#666" }}>Profile Status:</Typography>
                <Typography sx={{ color: profile.profileGenerated ? "#2d7a2d" : "#d32f2f" }}>
                  {profile.profileGenerated ? "✓ Generated" : "Not yet"}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Taste Summary Section */}
          {profile.tasteProfile && (
            <>
              <Box sx={{ mb: 3, p: 2, background: "#f5f5f5", border: "1px solid #ccc" }}>
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    mb: 2,
                    color: "#333",
                  }}
                >
                  Albums that shaped your taste
                </Typography>
                {surveyedAlbums.length > 0 ? (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
                      gap: "8px",
                    }}
                  >
                    {surveyedAlbums.map((album) => (
                      <Box
                        key={album.id}
                        sx={{
                          cursor: "pointer",
                          transition: "transform 0.2s",
                          "&:hover": {
                            transform: "scale(1.05)",
                          },
                        }}
                        onClick={() => {
                          if (album.spotifyUrl) {
                            window.open(album.spotifyUrl, "_blank");
                          }
                        }}
                        title={`${album.name} - ${album.artist}`}
                      >
                        <Box
                          component="img"
                          src={album.imageUrl}
                          alt={album.name}
                          sx={{
                            width: "100%",
                            aspectRatio: "1",
                            objectFit: "cover",
                            border: "1px solid #999",
                            borderRadius: "2px",
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: "9px",
                            mt: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "#555",
                          }}
                        >
                          {album.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: "11px", color: "#666", fontStyle: "italic" }}>
                    Survey albums to see them here
                  </Typography>
                )}
              </Box>

              {/* Emotional Dimensions Section */}
              <Box sx={{ mb: 3, p: 2, background: "#f5f5f5", border: "1px solid #ccc" }}>
                <Typography
                  sx={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    mb: 2,
                    color: "#333",
                  }}
                >
                  Your Emotional Profile
                </Typography>
                <Box sx={{ display: "grid", gap: 1.5 }}>
                  {emotionalDimensions.map((dim) => {
                    const value = profile.tasteProfile?.[dim.key as keyof TasteProfile] as number | undefined;
                    const percentage = value ? Math.round(value * 100) : 0;
                    return (
                      <Box key={dim.key}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 0.5,
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontSize: "11px", fontWeight: "bold", color: "#333" }}>
                              {dim.label}
                            </Typography>
                            <Typography sx={{ fontSize: "10px", color: "#666" }}>
                              {dim.description}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: "11px", fontWeight: "bold", minWidth: "40px", textAlign: "right", color: "#333" }}>
                            {percentage}%
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            height: "12px",
                            background: "#ddd",
                            border: "1px solid #999",
                            position: "relative",
                            overflow: "hidden",
                            borderRadius: "2px",
                          }}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              background: `linear-gradient(90deg, ${dim.color}, ${dim.color}dd)`,
                              width: `${percentage}%`,
                              transition: "width 0.3s ease",
                              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)`,
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </>
          )}

          {!profile.profileGenerated && (
            <Box sx={{ p: 2, background: "#fffacd", border: "1px solid #daa520", textAlign: "center" }}>
              <Typography sx={{ fontSize: "11px", color: "#333" }}>
                Complete {5 - profile.surveyCount} more album surveys to generate your full taste profile.
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
