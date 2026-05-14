import { Typography, Box } from "@mui/material";
import { apiClient } from "../services/api";

export default function Login() {
  const handleSpotifyLogin = () => {
    window.location.href = apiClient.getLoginUrl();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--color-vinyl-tan) 0%, var(--color-vinyl-tan) 100%)",
        fontFamily: '"Tahoma", sans-serif',
      }}
    >
      {/* Main Login Panel */}
      <Box
        sx={{
          display: "flex",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "400px",
          background: "linear-gradient(180deg, #dfdfdf 0%, #c0c0c0 100%)",
          border: "3px solid",
          borderColor: "#dfdfdf #808080 #808080 #dfdfdf",
          boxShadow: "inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >

        {/* Right Content Area */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 30px",
            background: "linear-gradient(180deg, #dfdfdf 0%, #c0c0c0 100%)",
          }}
        >
          <Typography
            sx={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#000080",
              mb: 1,
            }}
          >
            Welcome
          </Typography>
          <Typography
            sx={{
              fontSize: "12px",
              color: "#000",
              mb: 3,
              lineHeight: 1.5,
            }}
          >
            Sign in with your Spotify account to get personalized music recommendations based on your location and mood.
          </Typography>

          {/* Login Button */}
          <Box
            onClick={handleSpotifyLogin}
            sx={{
              px: "40px",
              py: "12px",
              background: "linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)",
              border: "2px solid",
              borderColor: "#dfdfdf #808080 #808080 #dfdfdf",
              boxShadow: "inset 1px 1px 0px rgba(255,255,255,0.8), inset -1px -1px 0px rgba(0,0,0,0.2)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#000",
              textAlign: "center",
              userSelect: "none",
              transition: "all 0.1s ease",
              display: "inline-block",
              alignSelf: "flex-start",
              "&:hover": {
                background: "linear-gradient(180deg, #e8e8e8 0%, #c8c8c8 100%)",
              },
              "&:active": {
                boxShadow: "inset -1px -1px 0px rgba(255,255,255,0.8), inset 1px 1px 0px rgba(0,0,0,0.2)",
                borderColor: "#808080 #dfdfdf #dfdfdf #808080",
              },
            }}
          >
            Sign In with Spotify
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
