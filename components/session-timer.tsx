'use client';

export function SessionTimer({
  remainingSeconds,
  totalSeconds,
  size = 200,
  strokeWidth = 6,
}: {
  remainingSeconds: number;
  totalSeconds: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference * progress;

  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  const display = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4fd1c5" />
            <stop offset="100%" stopColor="#38b2ac" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="url(#timer-gradient)" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 14px rgba(79,209,197,0.5))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{display}</span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>remaining</span>
      </div>
    </div>
  );
}
