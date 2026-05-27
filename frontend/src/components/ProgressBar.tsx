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
  width?: string; // Optional custom width
  className?: string; // Optional additional classes
  indeterminate?: boolean; // Force indeterminate mode
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  description,
  percentage,
  width = '100%',
  className = '',
  indeterminate = false,
}) => {
  // Determine if progress is indeterminate
  const isIndeterminate = indeterminate || value === undefined;
  
  // Clamp value between 0-100 if provided
  const clampedValue = value !== undefined ? Math.max(0, Math.min(100, value)) : undefined;
  const displayPercentage = percentage ?? clampedValue;

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
      <div className={`98 ${isIndeterminate ? 'progress-indeterminate' : ''}`} style={{ width }}>
        {isIndeterminate ? (
          <progress></progress>
        ) : (
          <progress max="100" value={clampedValue}></progress>
        )}
      </div>
    </div>
  );
};



