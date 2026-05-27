/**
 * Calculate centered window position
 * Returns x, y coordinates centered on the screen, or uses provided values
 */
export function calculateWindowPosition(
  initialX: number | undefined,
  initialY: number | undefined,
  initialWidth: number | string,
  initialHeight: number | string
): { x: number; y: number } {
  // Use provided position if both are defined
  if (initialX !== undefined && initialY !== undefined) {
    return { x: initialX, y: initialY };
  }

  // Parse dimensions
  const w = typeof initialWidth === "number" ? initialWidth : parseInt(initialWidth as string);
  const h = typeof initialHeight === "number" ? initialHeight : parseInt(initialHeight as string);

  // Calculate centered position
  return {
    x: Math.max(0, (window.innerWidth - w) / 2),
    y: Math.max(0, (window.innerHeight - h) / 2),
  };
}
