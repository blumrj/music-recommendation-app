import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "../services/api";
import type { User } from "../types";
import { redirect } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logoutUser: () => void;
  isAuthenticated: boolean;
}

// create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// context provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On mount, check if user is already logged in
  useEffect(() => {
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");

      if (accessToken) {
        try {
          const userData = await apiClient.getMe();
          setUser(userData);
        } catch (error: any) {
          // Don't auto-clear tokens on first failure - might be a temporary server error
          // The token might still be valid for other operations
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const logoutUser = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("spotifyToken");
    setUser(null);
    redirect("/login")
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, logoutUser, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// custom hook for easy usage of the context
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
