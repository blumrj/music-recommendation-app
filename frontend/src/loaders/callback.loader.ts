import { redirect } from "react-router-dom";

export const loader = async ({ request }: { request: Request }) => {
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");
    const spotifyToken = url.searchParams.get("spotifyToken");

    console.log("🔄 Callback loader executing...");
    console.log("  URL:", request.url);
    console.log("  Params found:", { 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken, 
      spotifyToken: !!spotifyToken 
    });

    if (!accessToken || !refreshToken) {
      console.error("❌ Missing tokens in callback URL");
      console.error("  accessToken:", accessToken);
      console.error("  refreshToken:", refreshToken);
      return redirect("/login");
    }

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    
    if (spotifyToken) {
      localStorage.setItem("spotifyToken", spotifyToken);
    }

    console.log("✅ Authenticated! Tokens stored in localStorage:");
    console.log("  📝 accessToken:", accessToken.substring(0, 30) + "...");
    console.log("  🔄 refreshToken:", refreshToken.substring(0, 30) + "...");
    if (spotifyToken) {
      console.log("  🎵 spotifyToken:", spotifyToken.substring(0, 30) + "...");
    }

    return redirect("/");
  } catch (error: any) {
    console.error("❌ Error in callback:", error);
    console.error("  Message:", error.message);
    console.error("  Stack:", error.stack);
    return redirect("/login");
  }
};

