import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ProgressBar, SliderInput, Modal, AlbumIcon } from "../components";
import type { Album, SliderResponses } from "../types";
import type { EmotionalDimension } from "../services/api";

// Default response values (neutral midpoint for all dimensions)
const DEFAULT_RESPONSES: SliderResponses = {
  valence: 50,
  arousal: 50,
  tension: 50,
  warmth: 50,
  intimacy: 50,
  density: 50,
  groundedness: 50,
};

// Transform response format for backend (add _response suffix to dimension names)
const transformResponsesToSurveyData = (responses: SliderResponses): Record<string, number> => {
  return Object.entries(responses).reduce((acc, [key, value]) => {
    acc[`${key}_response`] = value;
    return acc;
  }, {} as Record<string, number>);
};



// Constants
const MIN_SURVEYS_REQUIRED = 5;
const SUCCESS_REDIRECT_DELAY_MS = 2000;

export default function Onboarding() {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedAlbums, setSavedAlbums] = useState<Album[]>([]);
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  
  // Survey form state
  const [responses, setResponses] = useState<SliderResponses>(DEFAULT_RESPONSES);
  const [dimensions, setDimensions] = useState<EmotionalDimension[]>([]);
  const [dimensionsLoading, setDimensionsLoading] = useState(true);
  const [surveyLoading, setSurveyLoading] = useState(false);

  // Load user profile and albums for survey
  useEffect(() => {
    if (loading) return;

    const checkAndStartOnboarding = async () => {
      try {
        setLoadingProfile(true);
        const profile = await apiClient.getUserProfile();

        if (!profile.needsOnboarding || profile.profileGenerated || profile.surveyCount > 0) {
          navigate("/", { replace: true });
          return;
        }

        try {
          const albumsResponse = await apiClient.getAvailableAlbumsForSurvey();
          const albums = (albumsResponse.albums as Album[]) || [];
          setSavedAlbums(albums);
          setShowSurvey(true);
        } catch {
          setShowSurvey(true);
        }
      } catch {
        navigate("/", { replace: true });
      } finally {
        setLoadingProfile(false);
      }
    };

    checkAndStartOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Fetch emotional dimensions from backend on mount
  useEffect(() => {
    const fetchDimensions = async () => {
      try {
        const dims = await apiClient.getEmotionalDimensions();
        setDimensions(dims);
      } finally {
        setDimensionsLoading(false);
      }
    };

    fetchDimensions();
  }, []);

  // Reset responses when album changes
  useEffect(() => {
    setResponses(DEFAULT_RESPONSES);
  }, [currentAlbumIndex]);

  // Memoize calculated values
  const minSurveysNeeded = useMemo(
    () => Math.min(MIN_SURVEYS_REQUIRED, savedAlbums.length),
    [savedAlbums.length]
  );

  const isOnLastAlbum = currentAlbumIndex >= savedAlbums.length - 1;
  const currentAlbum = savedAlbums[currentAlbumIndex];
  const progress = ((completedCount / minSurveysNeeded) * 100) || 0;

  // Auto-redirect when success screen is shown
  useEffect(() => {
    if (!showSuccess) return;

    const timer = setTimeout(() => {
      navigate("/", { replace: true });
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [showSuccess, navigate]);

  const handleSkipAlbum = () => {
    if (isOnLastAlbum) {
      // On last album, skipping completes onboarding
      handleSurveySubmit();
    } else {
      // Move to next album
      setCurrentAlbumIndex((prev) => prev + 1);
    }
  };

  const handleSliderChange = (key: keyof SliderResponses, value: number) => {
    setResponses(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSurveySubmit = async () => {
    try {
      setSurveyLoading(true);
      const currentAlbum = savedAlbums[currentAlbumIndex];

      // Build survey payload with album metadata and transformed responses
      const surveyPayload = {
        albumName: currentAlbum.name,
        artist: currentAlbum.artist,
        imageUrl: currentAlbum.imageUrl,
        ...transformResponsesToSurveyData(responses)
      };

      await apiClient.saveSurvey(currentAlbum.spotifyId, surveyPayload);

      const newCompletedCount = completedCount + 1;
      setCompletedCount(newCompletedCount);

      // Check if we've completed required surveys or reached the end
      if (newCompletedCount >= minSurveysNeeded || currentAlbumIndex >= savedAlbums.length - 1) {
        // Auto-analyze profile
        setIsAnalyzing(true);
        try {
          await apiClient.analyzeTaste();
          setShowSurvey(false);
          setShowSuccess(true);
        } catch {
          setIsAnalyzing(false);
        }
      } else {
        // Move to next album
        setCurrentAlbumIndex((prev) => prev + 1);
      }
    } catch {
      alert('Failed to save survey. Please try again.');
    } finally {
      setSurveyLoading(false);
    }
  };

  // Show loading while checking auth and profile
  if (loading || loadingProfile) {
    return (
      <main className="h-full overflow-auto relative bg-secondary p-md">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <ProgressBar indeterminate label="Loading profile..." width="200px" />
        </div>
      </main>
    );
  }

  // Show analyzing screen
  if (isAnalyzing) {
    return (
      <main className="h-full overflow-auto relative bg-secondary p-md">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <ProgressBar indeterminate label="Analyzing your taste..." width="300px" />
          <p className="text-xs text-gray-700">This may take a few moments</p>
        </div>
      </main>
    );
  }

  // Show survey with album carousel
  if (showSurvey && !showSuccess && currentAlbum) {
    return (
      <main className="h-full overflow-auto relative bg-secondary">
        {/* Header with Progress */}
        <Modal
          title="Survey Progress"
          overlay={false}
          showClose={false}
          maxWidth="340px"
          maxHeight="auto"
          initialX={800}
          initialY={350}
          initialWidth={400}
          initialHeight={140}
          onClose={() => {}}
        >
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold">
              Survey {completedCount + 1} of {minSurveysNeeded}
            </p>
            <p className="text-xs text-gray-700">
              {completedCount} completed
            </p>
          </div>
          <ProgressBar value={progress} />
        </Modal>

        {/* Album Info */}
        <Modal
          title="Album Info"
          overlay={false}
          showClose={false}
          maxWidth="500px"
          maxHeight="auto"
          initialX={800}
          initialY={80}
          initialWidth={400}
          initialHeight={180}
          onClose={() => {}}
        >
          <div className="flex items-center gap-4">
            <AlbumIcon
              name={currentAlbum.name}
              artist={currentAlbum.artist}
              image={currentAlbum.imageUrl}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-black">
                {currentAlbum.name}
              </p>
              <p className="text-[11px] truncate text-gray-700">
                {currentAlbum.artist}
              </p>
            </div>
          </div>
        </Modal>

        {/* Survey Form */}
        <Modal
          title="How do you perceive this album?"
          overlay={false}
          showClose={false}
          maxWidth="360px"
          maxHeight="600px"
          initialX={80}
          initialY={80}
          initialWidth={500}
          initialHeight={450}
          onClose={() => {}}
        >
          <div className="flex flex-col h-full px-4 py-3">
            {/* Subtitle */}
            <p className="text-[11px] text-gray-700 mb-8 pb-4 border-b border-gray-300">
              Adjust each slider to describe your emotional experience
            </p>

            {/* Sliders */}
            <div className="flex-1 overflow-y-auto mb-8 space-y-6">
              {dimensionsLoading ? (
                <div className="text-xs text-gray-700">Loading dimensions...</div>
              ) : (
                dimensions.map((dimension) => (
                  <div key={dimension.name} className="pb-2">
                    <SliderInput
                      label={dimension.label}
                      description={dimension.description}
                      leftLabel={dimension.leftLabel}
                      rightLabel={dimension.rightLabel}
                      value={responses[dimension.name as keyof SliderResponses]}
                      onChange={(value) =>
                        handleSliderChange(dimension.name as keyof SliderResponses, value)
                      }
                      disabled={surveyLoading}
                      showValue={true}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-between pt-6 border-t border-gray-300">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentAlbumIndex > 0) {
                      setCurrentAlbumIndex((prev) => prev - 1);
                    }
                  }}
                  disabled={surveyLoading || currentAlbumIndex === 0}
                  className="button"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (currentAlbumIndex < savedAlbums.length - 1) {
                      setCurrentAlbumIndex((prev) => prev + 1);
                    }
                  }}
                  disabled={surveyLoading || currentAlbumIndex >= savedAlbums.length - 1}
                  className="button"
                >
                  Next →
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSkipAlbum}
                  disabled={surveyLoading}
                  className="button"
                >
                  Skip
                </button>

                <button
                  onClick={handleSurveySubmit}
                  disabled={surveyLoading}
                  className="button default"
                >
                  {surveyLoading ? 'Saving...' : 'Save Survey'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </main>
    );
  }

  // Show success screen after profile is created
  if (showSuccess) {
    return (
      <main className="h-full overflow-auto relative bg-secondary p-md">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="w-full max-w-md window">
            <div className="title-bar">
              <div className="title-bar-text">
                Profile Created
              </div>
            </div>
            <div className="window-body text-center">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-sm font-bold text-primary mb-4">
                Your taste profile is ready!
              </p>
              <p className="text-xs text-gray-700 mb-4">
                You can view details in your profile page and let's find new music for you!
              </p>
              <p className="text-[11px] text-gray-600">
                Redirecting to recommendations...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fallback - shouldn't reach here
  return null;
}

