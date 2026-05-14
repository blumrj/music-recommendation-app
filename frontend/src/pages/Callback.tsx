import { CircularProgress, Box, Typography } from "@mui/material";

export default function Callback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-vinyl-tan)' }}>
      <Box className="text-center">
        <CircularProgress sx={{ color: "#d4a574", marginBottom: 4 }} />
        <Typography variant="h5" className="text-white font-bold mb-2">
          Logging you in...
        </Typography>
        <Typography className="text-white text-sm">
          One moment while we connect with Spotify
        </Typography>
      </Box>
    </div>
  );
}