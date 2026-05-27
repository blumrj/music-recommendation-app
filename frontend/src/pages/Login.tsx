import { apiClient } from "../services/api";
import Modal from "../components/Modal";

export default function Login() {
  const handleSpotifyLogin = () => {
    window.location.href = apiClient.getLoginUrl();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-secondary p-md">
      <Modal 
        title="Music Recommendation"
        onClose={() => {}}
        movableOnly={true}
        initialWidth={450}
        initialHeight={250}
        bodyBg="bg-secondary"
        zIndex={100}
      >
        <div className="flex flex-col gap-lg">
          <div>
            <h2 className="text-md text-black">Welcome To Dora</h2>
            <p className="text-sm text-black">
              Sign in with your Spotify account to get personalized music recommendations based on your location and mood.
            </p>
          </div>

          <button
            onClick={handleSpotifyLogin}
            className="button w-full cursor-pointer"
          >
            Sign In with Spotify
          </button>
        </div>
      </Modal>
    </main>
  );
}
