import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface Recommendation {
  id: string;
  name: string;
  artist: string;
  image: string;
  spotifyUrl: string;
}

interface GenreCollection {
  name: string;
  albums: Recommendation[];
}

interface RecommendationsContextType {
  currentView: "picks" | { type: "genre"; index: number };
  setCurrentView: (view: "picks" | { type: "genre"; index: number }) => void;
  genres: GenreCollection[];
  setGenres: (genres: GenreCollection[]) => void;
}

const RecommendationsContext = createContext<RecommendationsContextType | undefined>(undefined);

export const RecommendationsProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<"picks" | { type: "genre"; index: number }>("picks");
  const [genres, setGenres] = useState<GenreCollection[]>([]);

  return (
    <RecommendationsContext.Provider value={{ currentView, setCurrentView, genres, setGenres }}>
      {children}
    </RecommendationsContext.Provider>
  );
};

export const useRecommendations = () => {
  const context = useContext(RecommendationsContext);
  if (!context) {
    throw new Error("useRecommendations must be used within RecommendationsProvider");
  }
  return context;
};
