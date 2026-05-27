import { useState } from "react";
import { getAlbumImage } from "../utils/getAlbumImage";

interface AlbumIconProps {
  name: string;
  artist: string;
  image: string;
  onClick?: () => void;
}

const AlbumIcon = ({
  name,
  artist,
  image,
  onClick,
}: AlbumIconProps) => {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const finalImage = getAlbumImage(image);
  const isUsingFallback = imageLoadFailed || finalImage === "/win98-icons/cd_audio_cd-0.png";

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 cursor-pointer select-none min-w-20 transition-all duration-200 hover:scale-105"
    >
      {/* Album Art */}
      <div
        className="w-16 h-16 border-2 border-accent-secondary shadow-md relative overflow-hidden flex items-center justify-center bg-gray-200"
        style={{
          backgroundImage: !isUsingFallback ? `url('${finalImage}')` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onError={() => setImageLoadFailed(true)}
      >
        {isUsingFallback && (
          <img
            src="/win98-icons/cd_audio_cd-0.png"
            alt="Default album cover"
            className="w-10 h-10 opacity-70"
            onError={() => {}} // Fallback for fallback - silent fail
          />
        )}
      </div>

      {/* Album Info */}
      <div className="text-center w-full">
        <p className="text-xs font-semibold text-text-primary truncate max-w-20"
          title={name}
        >
          {name}
        </p>
        <p
          className="text-[10px] text-text-secondary truncate max-w-20"
          title={artist}
        >
          {artist}
        </p>
      </div>
    </div>
  );
};

export default AlbumIcon;
