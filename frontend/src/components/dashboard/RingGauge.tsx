interface RingGaugeProps {
  value: number; // 0-100
  color: string; // mis. 'var(--gc-success)'
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  ariaLabel: string;
}

/** Ring tipis statis (tanpa animasi). */
export function RingGauge({ value, color, size = 132, stroke = 10, label, sub, ariaLabel }: RingGaugeProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'var(--gc-surface)' }} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`} style={{ stroke: color }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none text-[var(--gc-text)]">{label ?? Math.round(v)}</span>
        {sub && <span className="mt-1 text-[11px] text-[var(--gc-text-secondary)]">{sub}</span>}
      </div>
    </div>
  );
}
