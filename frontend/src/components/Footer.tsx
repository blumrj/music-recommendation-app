import { Box, Typography } from "@mui/material";

interface FooterProps {
  status?: string;
}

const Footer = ({ status = "Ready" }: FooterProps) => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)',
        borderTop: '2px solid #dfdfdf',
        boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        paddingX: '4px',
        paddingY: '2px',
        minHeight: '22px',
        gap: '4px',
      }}
    >
      {/* Status indicator */}
      <Box
        sx={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: '#0a7d3e',
          boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.3), inset 1px 1px 0 rgba(255,255,255,0.5)',
        }}
      />

      {/* Status text */}
      <Typography
        sx={{
          fontSize: '11px',
          color: '#000',
          marginY: 'auto',
          flex: 1,
        }}
      >
        {status}
      </Typography>

      {/* Resize handle (optional) */}
      <Box
        sx={{
          display: 'flex',
          gap: '1px',
          alignItems: 'center',
          height: '12px',
        }}
      >
        <Box sx={{ width: '2px', height: '2px', background: '#dfdfdf' }} />
        <Box sx={{ width: '2px', height: '2px', background: '#dfdfdf' }} />
        <Box sx={{ width: '2px', height: '2px', background: '#dfdfdf' }} />
      </Box>
    </Box>
  );
};

export default Footer;
