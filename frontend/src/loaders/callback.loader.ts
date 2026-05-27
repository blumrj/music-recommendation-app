import { redirect } from "react-router-dom";

export const loader = async ({ request }: { request: Request }) => {
  try {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get("accessToken");
    const refreshToken = url.searchParams.get("refreshToken");
    const spotifyToken = url.searchParams.get("spotifyToken");

    if (!accessToken || !refreshToken) {
      return redirect("/login");
    }

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    
    if (spotifyToken) {
      localStorage.setItem("spotifyToken", spotifyToken);
    }

    return redirect("/");
  } catch (error: any) {
    return redirect("/login");
  }
};

