type Props = {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  className?: string;
  ariaLabel?: string;
};

export function EditableNumber({
  value,
  onChange,
  step = 1,
  min,
  className,
  ariaLabel,
}: Props) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      aria-label={ariaLabel}
      value={Number.isFinite(value) ? value : ''}
      step={step}
      min={min}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}
