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
        onToggleSidebar={showSidebar ? toggleSidebar : undefined}
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
              DORA remembers how music makes you feel.
            </p>
            <p className="text-xs leading-relaxed mb-2">
              As you share your favorite albums, what makes them special, when you listen to them, how they make you feel, a picture of your taste emerges naturally. It's about learning yourself through music.
            </p>
            <p className="text-xs leading-relaxed">
              From that, DORA builds a profile that's entirely yours. When you ask for recommendations, it weighs who you are against the moment you're in and finds something that fits.
            </p>
          </div>
        </Modal>
      )}

      {/* Page Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <>
            {/* Mobile backdrop — tap to close */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 md:hidden"
                onClick={toggleSidebar}
              />
            )}

            <div
              className={`overflow-auto bg-primary z-40
                ${sidebarOpen
                  ? 'fixed md:relative top-13.5 md:top-auto bottom-10.5 md:bottom-auto left-0 w-55'
                  : 'hidden md:block md:w-12.5'
                }`}
              style={{
                borderRight: "2px solid",
                borderColor: "rgb(223, 223, 223) rgb(128, 128, 128) rgb(128, 128, 128) rgb(223, 223, 223)",
              }}
            >
              <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
            </div>
          </>
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
