'use client';

interface Props {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (v: number) => void;
}

const SIZES = { sm: 14, md: 18, lg: 22 };

export default function StarRating({ value, max = 5, size = 'md', onChange }: Props) {
  const px = SIZES[size];
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            onClick={onChange ? () => onChange(i + 1) : undefined}
            className={onChange ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}
            style={{ padding: 0, background: 'none', border: 'none' }}
          >
            <svg width={px} height={px} viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? '#EF9F27' : '#E5E7EB'}
                stroke={filled ? '#D97706' : '#D1D5DB'}
                strokeWidth="0.5"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
