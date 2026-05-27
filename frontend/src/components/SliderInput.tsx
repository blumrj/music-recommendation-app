/**
 * Slider Input Component
 * Range slider following 98.css structure
 */

interface SliderInputProps {
  label: string;
  description?: string;
  leftLabel?: string;
  rightLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
}

export function SliderInput({
  label,
  description,
  leftLabel,
  rightLabel,
  min = 0,
  max = 100,
  step = 5,
  value,
  onChange,
  disabled = false,
  showValue = true,
}: SliderInputProps) {
  return (
    <div className="mb-4">
      <label className="text-xs font-bold text-text-primary block mb-1">{label}</label>
      {description && (
        <p className="text-[11px] text-text-secondary mb-2">{description}</p>
      )}
      
      <div className="flex items-center gap-2">
        {leftLabel && (
          <span className="text-[11px] text-text-secondary shrink-0">{leftLabel}</span>
        )}
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="flex-1 min-w-0"
        />
        
        {rightLabel && (
          <span className="text-[11px] text-text-secondary shrink-0">{rightLabel}</span>
        )}
        
        {showValue && (
          <span className="text-[11px] font-semibold text-text-primary w-8 text-right shrink-0">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
