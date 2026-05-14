import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Rnd } from "react-rnd";

interface XPWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  initialWidth?: number | string;
  initialHeight?: number | string;
  zIndex?: number;
  onFocus?: () => void;
}

const XPWindow = ({
  title,
  onClose,
  children,
  initialX = 50,
  initialY = 50,
  initialWidth = 600,
  initialHeight = 400,
  zIndex = 10,
  onFocus,
}: XPWindowProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) return null;

  return (
    <Rnd
      default={{
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
      }}
      minWidth={300}
      minHeight={200}
      onMouseDown={onFocus}
      style={{ zIndex }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, #c0c0c0 0%, #dfdfdf 100%)",
          border: "2px solid #dfdfdf",
          boxShadow: `
            inset 1px 1px 0px rgba(255,255,255,0.8),
            inset -1px -1px 0px rgba(0,0,0,0.4),
            0 0 0 1px #808080
          `,
          display: "flex",
          flexDirection: "column",
          fontFamily: "MS Sans Serif, Arial, sans-serif",
          userSelect: "none",
        }}
      >
        {/* Title Bar */}
        <Box
          sx={{
            background: "linear-gradient(90deg, #5B4B8E 0%, #9B8CB8 100%)",
            padding: "2px 2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "move",
            minHeight: "20px",
            flexShrink: 0,
            touchAction: "none",
          }}
          className="rnd-handle"
        >
          <Typography
            sx={{
              color: "#fff",
              fontSize: "12px",
              fontWeight: "bold",
              flex: 1,
              paddingLeft: "2px",
            }}
          >
            {title}
          </Typography>

          {/* Window Buttons */}
          <Box sx={{ display: "flex", gap: "2px", paddingRight: "2px" }}>
            <XPButton
              onClick={() => setIsMinimized(true)}
              title="Minimize"
              size="small"
            >
              _
            </XPButton>
            <XPButton onClick={onClose} title="Close" size="small">
              ✕
            </XPButton>
          </Box>
        </Box>

        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            padding: "4px",
            background: "#c0c0c0",
          }}
        >
          {children}
        </Box>
      </Box>
    </Rnd>
  );
};

const XPButton = ({
  onClick,
  children,
  title,
  size = "medium",
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  size?: "small" | "medium";
}) => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Box
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      title={title}
      sx={{
        width: size === "small" ? "18px" : "24px",
        height: size === "small" ? "18px" : "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isPressed
          ? "linear-gradient(180deg, #808080 0%, #dfdfdf 100%)"
          : "linear-gradient(180deg, #dfdfdf 0%, #808080 100%)",
        border: "2px solid #dfdfdf",
        boxShadow: isPressed
          ? "inset 1px 1px 0px rgba(255,255,255,0.3), inset -1px -1px 0px rgba(0,0,0,0.6)"
          : "inset 1px 1px 0px rgba(255,255,255,0.8), inset -1px -1px 0px rgba(0,0,0,0.4)",
        cursor: "pointer",
        fontSize: size === "small" ? "10px" : "12px",
        fontWeight: "bold",
        color: "#000",
        padding: 0,
      }}
    >
      {children}
    </Box>
  );
};

export default XPWindow;
