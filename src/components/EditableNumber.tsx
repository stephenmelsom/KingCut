import { useEffect, useState } from 'react';

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
  const [text, setText] = useState(String(value ?? ''));

  useEffect(() => {
    setText(String(value ?? ''));
  }, [value]);

  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      aria-label={ariaLabel}
      value={text}
      step={step}
      min={min}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        if (text === '' || Number.isNaN(Number(text))) {
          setText(String(value ?? 0));
        }
      }}
    />
  );
}
