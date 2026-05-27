import { useState, useEffect } from "react";
import { apiClient, type EmotionalDimension, type UserProfileResponse, type SurveyedAlbumsResponse } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ProgressBar, AlbumGrid, Modal } from "../components";
import { parseApiError } from "../utils/helpers";

export default function Profile() {
  const { loading } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [surveyedAlbums, setSurveyedAlbums] = useState<SurveyedAlbumsResponse['albums']>([]);
  const [emotionalDimensions, setEmotionalDimensions] = useState<EmotionalDimension[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeTaste = async () => {
    setIsAnalyzing(true);
    try {
      await apiClient.analyzeTaste();
      const updatedProfile = await apiClient.getUserProfile();
      setProfile(updatedProfile);
      setError(null);
    } catch (err: unknown) {
      setError(parseApiError(err) || "Failed to analyze profile. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    const fetchProfile = async () => {
      try {
        const [profileData, albumsData, dimensionsData] = await Promise.all([
          apiClient.getUserProfile(),
          apiClient.getSurveyedAlbums(),
          apiClient.getEmotionalDimensions(),
        ]);
        setProfile(profileData);
        setSurveyedAlbums(albumsData.albums);
        setEmotionalDimensions(dimensionsData);
      } catch (err: unknown) {
        setError(parseApiError(err) || "Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [loading]);

  if (loading || loadingProfile) {
    return (
      <main className="h-full overflow-auto relative bg-secondary p-md">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <ProgressBar indeterminate label="Loading profile..." width="200px" />
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="h-full overflow-auto relative bg-secondary p-md">
        <div className="flex flex-col items-center justify-center h-full">
          <Modal
            title="Error"
            onClose={() => setError(null)}
            overlay={true}
            closeOnBackdropClick={false}
            showClose={false}
            zIndex={9999}
          >
            <div className="p-md text-center">
              <p className="text-xs text-tension font-bold mb-2">❌ {error || "Profile not found"}</p>
            </div>
          </Modal>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full overflow-auto relative bg-secondary">
      {isAnalyzing && (
        <Modal
          title="Analyzing"
          onClose={() => {}}
          overlay={true}
          closeOnBackdropClick={false}
          zIndex={9999}
        >
          <div className="p-md text-center flex flex-col items-center gap-md">
            <ProgressBar indeterminate label="Analyzing your taste..." width="200px" />
            <p className="text-xs text-gray-700">This may take a few moments</p>
          </div>
        </Modal>
      )}

      {/* Your Profile Card */}
      {profile.profileGenerated && (
        <Modal
          title="Your Profile"
          overlay={false}
          initialX={50}
          initialY={50}
          initialWidth={420}
          initialHeight="auto"
          onClose={() => {}}
          showClose={false}
        >
          <div className="grid grid-cols-2 gap-md text-xs">
            <div>
              <p className="font-bold text-text-secondary m-0">Name:</p>
              <p className="text-text-primary m-0">{profile.name}</p>
            </div>
            <div>
              <p className="font-bold text-text-secondary m-0">Profile Created:</p>
              <p className="text-text-primary m-0">{new Date(profile.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="col-span-2">
              <p className="font-bold text-text-secondary m-0">Albums Analyzed:</p>
              <p className="text-text-primary m-0">{profile.tasteProfile?.albumsAnalyzed || 0}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Analyze Button Card */}
      {!profile.profileGenerated && profile.surveyCount >= 5 && (
        <Modal
          title="Ready to Analyze?"
          overlay={false}
          initialX={50}
          initialY={50}
          initialWidth={420}
          initialHeight="auto"
          onClose={() => {}}
          showClose={false}
        >
          <div className="text-center">
            <p className="text-xs mb-md text-text-primary m-0">
              You've completed {profile.surveyCount} surveys. Analyze them to create your emotional profile.
            </p>
            <button
              onClick={handleAnalyzeTaste}
              disabled={isAnalyzing}
              className="button cursor-pointer"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Your Profile"}
            </button>
          </div>
        </Modal>
      )}

      {/* Incomplete Profile Message */}
      {!profile.profileGenerated && profile.surveyCount < 5 && (
        <Modal
          title="Profile Status"
          overlay={false}
          initialX={50}
          initialY={50}
          initialWidth={420}
          initialHeight="auto"
          onClose={() => {}}
          showClose={false}
        >
          <div className="text-center p-md bg-warmth/10 border border-warmth">
            <p className="text-xs text-text-primary m-0">
              Complete {5 - profile.surveyCount} more album surveys to generate your full taste profile.
            </p>
          </div>
        </Modal>
      )}

      {/* Albums Section */}
      {profile.profileGenerated && surveyedAlbums.length > 0 && (
        <Modal
          title="Albums That Shaped Your Taste"
          overlay={false}
          initialX={50}
          initialY={250}
          initialWidth={500}
          initialHeight="auto"
          onClose={() => {}}
          showClose={false}
        >
          <AlbumGrid
            albums={surveyedAlbums}
            onAlbumClick={(album) => {
              if (album.spotifyUrl) {
                window.open(album.spotifyUrl, "_blank");
              }
            }}
            empty={surveyedAlbums.length === 0}
            emptyMessage="Survey albums to see them here"
          />
        </Modal>
      )}

      {/* Emotional Dimensions Section */}
      {profile.profileGenerated && emotionalDimensions.length > 0 && (
        <Modal
          title="Your Emotional Profile"
          overlay={false}
          initialX={700}
          initialY={100}
          initialWidth={500}
          initialHeight="auto"
          onClose={() => {}}
          showClose={false}
        >
          <div className="space-y-md">
            {emotionalDimensions.map((dim: EmotionalDimension) => {
              const value = profile?.tasteProfile?.[dim.name] as number | undefined;
              const percentage = value ? Math.round(value * 100) : 0;
              return (
                <div key={dim.name}>
                  <ProgressBar
                    value={percentage}
                    label={dim.name.charAt(0).toUpperCase() + dim.name.slice(1)}
                    description={dim.description}
                    percentage={percentage}
                    width="100%"
                  />
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </main>
  );
}
