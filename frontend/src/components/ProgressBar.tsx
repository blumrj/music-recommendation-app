/**
 * PROGRESS BAR COMPONENT
 * Win98-style progress bar for displaying numeric progress (0-100%)
 * Uses native HTML <progress> element with 98.css styling
 * 
 * Supports:
 * - Determinate progress: Set `value` prop (0-100)
 * - Indeterminate progress: Omit `value` prop for animated loading indicator
 */

import React from 'react';

interface ProgressBarProps {
  value?: number; // 0-100 (optional - omit for indeterminate/loading state)
  label?: string; // Optional label text above the bar
  description?: string; // Optional description text above the bar
  percentage?: number; // Optional percentage to display (defaults to value if not provided)
  width?: string; // Optional custom width (default: 100%)
  height?: string; // Optional custom height (default: 16px from 98.css)
  barColor?: 'accent' | 'warmth' | 'grounded' | 'tension'; // Color variant (default: accent)
  className?: string; // Optional additional classes
  indeterminate?: boolean; // Force indeterminate mode
}

const colorMap: Record<string, string> = {
  accent: 'var(--color-accent)',
  warmth: 'var(--color-warmth)',
  grounded: 'var(--color-grounded)',
  tension: 'var(--color-tension)',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  description,
  percentage,
  width = '100%',
  height = '16px',
  barColor = 'accent',
  className = '',
  indeterminate = false,
}) => {
  // Determine if progress is indeterminate
  const isIndeterminate = indeterminate || value === undefined;
  
  // Clamp value between 0-100 if provided
  const clampedValue = value !== undefined ? Math.max(0, Math.min(100, value)) : undefined;
  const displayPercentage = percentage ?? clampedValue;
  
  // Get color for this instance
  const barColorValue = colorMap[barColor] || colorMap.accent;

  return (
    <div className={className}>
      {(label || (displayPercentage !== undefined && !isIndeterminate)) && (
        <div className="flex justify-between items-start mb-1">
          <div>
            {label && (
              <div className="text-xs font-bold text-text-primary">{label}</div>
            )}
            {description && (
              <div className="text-[10px] text-text-secondary">{description}</div>
            )}
          </div>
          {displayPercentage !== undefined && !isIndeterminate && (
            <p className="text-xs font-bold min-w-10 text-right text-text-primary m-0">
              {displayPercentage}%
            </p>
          )}
        </div>
      )}
      
      <div 
        className="98 w-full"
        style={{ width, '--progress-height': height, '--progress-color': barColorValue } as React.CSSProperties}
      >
        {isIndeterminate ? (
          // Retro animated indeterminate progress bar
          <div className="progress-bar-indeterminate">
            {/* Animated striped bar */}
            <div className="progress-bar-stripes" />
          </div>
        ) : (
          // Determinate progress with native element
          <progress max="100" value={clampedValue} className="progress-bar-determinate" />
        )}
      </div>
    </div>
  );
};



