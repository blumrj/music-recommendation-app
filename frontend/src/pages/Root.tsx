import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import Modal from "../components/Modal";
import { getSidebarState, setSidebarState } from "../utils/sidebarStorage";

const Root = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDoraInfo, setShowDoraInfo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => getSidebarState());

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    setSidebarState(newState);
  };

  // Show sidebar on all pages except login/callback
  const showSidebar = location.pathname !== "/login" && location.pathname !== "/callback";


  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      {/* Menu Bar + Header */}
      <Header
        isLoggedIn={!!user}
        onLogout={handleLogout}
        onAboutDora={() => setShowDoraInfo(true)}
      />

      {/* About DORA Modal */}
      {showDoraInfo && (
        <Modal
          title="How DORA Works"
          onClose={() => setShowDoraInfo(false)}
          overlay={true}
          closeOnBackdropClick={true}
          zIndex={9999}
        >
          <div className="p-md text-md text-center">
            <p className="text-xs leading-relaxed mb-2">
              DORA helps you discover music that feels right for you. By
              reflecting on albums you love, you start to understand what draws
              you in—the moods, the sounds, the feelings. It's about learning
              yourself through music.
            </p>
            <p className="text-xs leading-relaxed mb-2">
              As you tell DORA about your favorite albums—what makes them
              special, when you listen to them, how they make you feel—a picture
              of your taste emerges naturally. What are your constant themes?
              What contexts bring out different sides of you?
            </p>
            <p className="text-xs leading-relaxed">
              When you're ready for recommendations, DORA considers who you are
              musically and what's happening around you—the weather, the time of
              day, your mood. It's less about being served suggestions and more
              about finding music that resonates with where you're at in that
              moment.
            </p>
          </div>
        </Modal>
      )}

      {/* Page Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only visible on home pages */}
        {showSidebar && (
          <div
            className={`overflow-auto bg-primary ${sidebarOpen ? 'w-55' : 'w-12.5'}`}
            style={{
              borderRight: "2px solid",
              borderColor: "rgb(223, 223, 223) rgb(128, 128, 128) rgb(128, 128, 128) rgb(223, 223, 223)",
            }}
          >
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Root;
