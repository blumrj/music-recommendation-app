import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import MenuBar from "../components/MenuBar";
import FolderTree from "../components/FolderTree";
import XPWindow from "../components/XPWindow";

const Root = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDoraInfo, setShowDoraInfo] = useState(false);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  // Show sidebar on home, favorites, and profile pages
  const showSidebar = location.pathname === "/" || 
                      location.pathname === "/favorites" ||
                      location.pathname === "/profile";

  // Determine which folder is selected based on current path
  const getSelectedFolder = () => {
    if (location.pathname === "/favorites") return "favorites";
    if (location.pathname === "/profile") return "profile";
    return "todays-picks";
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-vinyl-tan)',
      }}
    >
      {/* Menu Bar + Header */}
      <MenuBar
        isLoggedIn={!!user}
        onLogout={handleLogout}
        onAboutDora={() => setShowDoraInfo(true)}
      />

      {/* About DORA Modal */}
      {showDoraInfo && (
        <XPWindow
          title="How DORA Works"
          onClose={() => setShowDoraInfo(false)}
          onFocus={() => {}}
        >
          <Box sx={{ p: 2,  fontSize: "12px", textAlign: "center" }}>
            <Typography
              sx={{
                fontSize: "11px",
                lineHeight: 1.6,
                color: "#555",
                mb: 1,
              }}
            >
              DORA helps you discover music that feels right for you. By reflecting on albums you love, you start to understand what draws you in—the moods, the sounds, the feelings. It's about learning yourself through music.
            </Typography>
            <Typography
              sx={{
                fontSize: "11px",
                lineHeight: 1.6,
                color: "#555",
                mb: 1,
              }}
            >
              As you tell DORA about your favorite albums—what makes them special, when you listen to them, how they make you feel—a picture of your taste emerges naturally. What are your constant themes? What contexts bring out different sides of you?
            </Typography>
            <Typography
              sx={{
                fontSize: "11px",
                lineHeight: 1.6,
                color: "#555",
              }}
            >
              When you're ready for recommendations, DORA considers who you are musically and what's happening around you—the weather, the time of day, your mood. It's less about being served suggestions and more about finding music that resonates with where you're at in that moment.
            </Typography>
          </Box>
        </XPWindow>
      )}

      {/* Page Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar - only visible on home pages */}
        {showSidebar && (
          <Box
            sx={{
              width: '220px',
              background: '#c0c0c0',
              borderRight: '2px solid',
              borderColor: '#dfdfdf #808080 #808080 #dfdfdf',
              overflow: 'auto',
              boxShadow: 'inset -1px -1px 0 rgba(255,255,255,0.5), inset 1px 1px 0 rgba(0,0,0,0.3)',
            }}
          >
            <FolderTree
              onFolderSelect={() => {}}
              selectedFolder={getSelectedFolder()}
            />
          </Box>
        )}
        
        {/* Main Content */}
        <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Outlet />
        </Box>
      </Box>

      {/* Footer */}
      <Footer status="Built with PATIENCE :)" />
    </Box>
  );
};

export default Root;
