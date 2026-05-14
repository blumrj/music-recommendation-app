import { Box } from "@mui/material";

interface MenuBarProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
  onAboutDora?: () => void;
}

const MenuBar = ({ isLoggedIn = false, onLogout, onAboutDora }: MenuBarProps) => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)',
        borderBottom: '2px solid #dfdfdf',
        boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingX: '4px',
        paddingY: '6px',
        minHeight: '54px',
        gap: '8px',
      }}
    >
      {/* Left Side: App Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
        <Box sx={{ fontSize: '16px', fontWeight: 'bold', color: '#000' }}>
          DORA
        </Box>
      </Box>

      {/* Right Side: Buttons */}
      <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* About DORA Button */}
        <Box
          onClick={onAboutDora}
          sx={{
            px: '16px',
            py: '4px',
            background: 'linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)',
            border: '2px solid',
            borderColor: '#dfdfdf #808080 #808080 #dfdfdf',
            boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#000',
            userSelect: 'none',
            transition: 'all 0.1s ease',
            whiteSpace: 'nowrap',
            '&:hover': {
              background: 'linear-gradient(180deg, #dfdfdf 0%, #bfbfbf 100%)',
              boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.6), inset -1px -1px 0px rgba(0,0,0,0.3)',
            },
            '&:active': {
              boxShadow: 'inset -1px -1px 0px rgba(255,255,255,0.5), inset 1px 1px 0px rgba(0,0,0,0.3)',
              borderColor: '#808080 #dfdfdf #dfdfdf #808080',
            },
          }}
        >
          ? About
        </Box>

        {/* Logout Button */}
        {isLoggedIn && (
          <Box
            onClick={onLogout}
            sx={{
              px: '16px',
              py: '4px',
              background: 'linear-gradient(180deg, #e0e0e0 0%, #c0c0c0 100%)',
              border: '2px solid',
              borderColor: '#dfdfdf #808080 #808080 #dfdfdf',
              boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#000',
              userSelect: 'none',
              transition: 'all 0.1s ease',
              whiteSpace: 'nowrap',
              '&:hover': {
                background: 'linear-gradient(180deg, #dfdfdf 0%, #bfbfbf 100%)',
                boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.6), inset -1px -1px 0px rgba(0,0,0,0.3)',
              },
              '&:active': {
                boxShadow: 'inset -1px -1px 0px rgba(255,255,255,0.5), inset 1px 1px 0px rgba(0,0,0,0.3)',
                borderColor: '#808080 #dfdfdf #dfdfdf #808080',
              },
            }}
          >
            Logout
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MenuBar;
