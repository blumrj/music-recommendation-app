import { useMemo, useState } from "react";
import { Rnd, type DraggableData } from "react-rnd";
import { calculateWindowPosition } from "../utils/calculateWindowPosition";
import { useIsMobile } from "../hooks/useIsMobile";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  initialWidth?: number | string;
  initialHeight?: number | string;
  zIndex?: number;
  onFocus?: () => void;
  movableOnly?: boolean;
  overlay?: boolean; // When true, uses fixed overlay instead of draggable window
  closeOnBackdropClick?: boolean; // For overlay mode
  maxWidth?: string | number; // For overlay mode
  maxHeight?: string | number; // For overlay mode
  showClose?: boolean; // Show/hide close button (default true)
  bodyBg?: string; // Background color for modal body (default: bg-primary)
}

const Modal = ({
  title,
  onClose,
  children,
  initialX,
  initialY,
  initialWidth = 600,
  initialHeight = 400,
  zIndex = 10,
  onFocus,
  movableOnly = false,
  overlay = false,
  closeOnBackdropClick = true,
  maxWidth = "550px",
  maxHeight = "85vh",
  showClose = true,
  bodyBg = "bg-primary",
}: ModalProps) => {
  const [currentZIndex, setCurrentZIndex] = useState(zIndex);
  const isMobile = useIsMobile();

  // Calculate draggable position (used in draggable mode)
  const { x, y } = useMemo(
    () => calculateWindowPosition(initialX, initialY, initialWidth, initialHeight),
    [initialX, initialY, initialWidth, initialHeight]
  );

  const handleDragStart = () => {
    setCurrentZIndex(1000 + Math.floor(Math.random() * 1000));
    onFocus?.();
  };

  const handleDrag = (_e: unknown, d: DraggableData) => {
    // Constrain to not overlap with sidebar (220px) and header (54px)
    if (d.x < 220) {
      d.x = 220;
    }
    if (d.y < 54) {
      d.y = 54;
    }
  };
  // Overlay mode: fixed positioned modal with backdrop
  if (overlay) {
    const handleBackdropClick = () => {
      if (closeOnBackdropClick) {
        onClose();
      }
    };

    return (
      <div
        onClick={handleBackdropClick}
        className="98 fixed inset-0 flex items-center justify-center"
        style={{
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: zIndex,
        }}
      >
        <div
          className="window w-[90%] flex flex-col overflow-hidden"
          style={{
            maxWidth,
            maxHeight,
            fontSize: "11px",
          }}
        >
          {/* Title Bar */}
          <div className="title-bar flex items-center justify-between shrink-0 bg-gradient-modal">
            <div className="title-bar-text flex-1 text-light">
              {title}
            </div>

            {/* Window Controls */}
            {showClose && (
              <div className="title-bar-controls">
                <button aria-label="Close" onClick={onClose} />
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className={`window-body flex-1 overflow-auto ${bodyBg}`}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Mobile: render as static stacked block (no drag)
  if (isMobile) {
    return (
      <div className="window w-full mb-4" style={{ fontSize: "11px" }}>
        <div className="title-bar flex items-center justify-between shrink-0 bg-gradient-modal">
          <div className="title-bar-text flex-1 text-light">{title}</div>
          {!movableOnly && showClose && (
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={onClose} />
            </div>
          )}
        </div>
        <div className={`window-body overflow-auto ${bodyBg}`}>
          {children}
        </div>
      </div>
    );
  }

  // Draggable window mode (desktop)
  return (
    <Rnd
      default={{
        x: Math.max(220, x),
        y: Math.max(54, y),
        width: initialWidth,
        height: initialHeight,
      }}
      minWidth={300}
      minHeight={200}
      onMouseDown={handleDragStart}
      onDrag={handleDrag}
      dragHandleClassName="rnd-handle"
      bounds="window"
      style={{ zIndex: currentZIndex }}
    >
      <div className="window w-full h-full flex flex-col select-none">
        {/* Title Bar */}
        <div className="title-bar rnd-handle flex items-center justify-between shrink-0 bg-gradient-modal cursor-grab active:cursor-grabbing" style={{ touchAction: "none" }}>
          <div className="title-bar-text flex-1 text-light">
            {title}
          </div>

          {/* Window Controls */}
          {!movableOnly && showClose && (
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={onClose} />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className={`window-body flex-1 overflow-auto ${bodyBg}`}>
          {children}
        </div>
      </div>
    </Rnd>
  );
};

export default Modal;

