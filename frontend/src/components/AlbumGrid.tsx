/**
 * Album Grid Component
 * Reusable grid for displaying albums with AlbumIcon
 */

import type { Album, Recommendation } from "../types";
import AlbumIcon from "./AlbumIcon";

interface AlbumGridProps {
  albums: Album[] | Recommendation[];
  onAlbumClick?: (album: Album | Recommendation) => void;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  columns?: number;
  gap?: string;
}

export function AlbumGrid({
  albums,
  onAlbumClick,
  loading = false,
  empty = false,
  emptyMessage = "No albums to display",
  gap = "16px",
}: AlbumGridProps) {
  if (loading) {
    return (
      <div className="text-center p-xl">
        <p>Loading albums...</p>
      </div>
    );
  }

  if (empty || albums.length === 0) {
    return (
      <div className="text-center p-xl text-text-secondary">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(80px, 1fr))`, gap, paddingBottom: "16px" }}>
      {albums.map((album) => {
        const typedAlbum = album as Album & Partial<Recommendation>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const key = typedAlbum.spotifyId ?? (typedAlbum as any).id ?? "unknown";
        const name = typedAlbum.name;
        const artist = typedAlbum.artist;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const image = typedAlbum.imageUrl ?? (typedAlbum as any).image ?? "";

        return (
          <AlbumIcon
            key={key}
            name={name}
            artist={artist}
            image={image}
            onClick={() => onAlbumClick?.(album)}
          />
        );
      })}
    </div>
  );
}
