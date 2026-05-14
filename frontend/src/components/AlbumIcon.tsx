import { Box, Typography } from "@mui/material";

interface AlbumIconProps {
  name: string;
  artist: string;
  image: string;
  isSelected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

const AlbumIcon = ({
  name,
  artist,
  image,
  isSelected = false,
  onClick,
  onDoubleClick,
}: AlbumIconProps) => {
  return (
    <Box
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        background: isSelected ? 'rgba(10, 36, 106, 0.3)' : 'transparent',
        borderRadius: '4px',
        border: isSelected ? '1px dashed #0a246a' : '1px dashed transparent',
        transition: 'all 0.2s ease',
        minWidth: '80px',
        '&:hover': {
          background: isSelected ? 'rgba(10, 36, 106, 0.4)' : 'rgba(0, 0, 0, 0.05)',
          transform: 'scale(1.05)',
        },
      }}
    >
      {/* CD Icon with Album Art */}
      <Box
        sx={{
          width: '64px',
          height: '64px',
          borderRadius: '4px',
          backgroundImage: `url('${image}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '2px solid #888',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* CD shine effect */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Album Info */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography
          sx={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#000',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80px',
          }}
          title={name}
        >
          {name}
        </Typography>
        <Typography
          sx={{
            fontSize: '10px',
            color: '#555',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '80px',
          }}
          title={artist}
        >
          {artist}
        </Typography>
      </Box>
    </Box>
  );
};

export default AlbumIcon;
