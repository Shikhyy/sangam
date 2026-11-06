/**
 * The Sangam mark: two strands, one warm and one pale, curve in from the left and join into a single
 * line, inside a rounded olive tile. Sangam means a meeting point.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Sangam">
      <title>Sangam</title>
      <defs>
        <linearGradient id="sg-tile" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e7152" />
          <stop offset="1" stopColor="#4b4d36" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#sg-tile)" />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10.25" fill="none" stroke="#ffffff" strokeOpacity="0.18" />
      <g fill="none" strokeWidth="3.4" strokeLinecap="round">
        <path d="M8 13C17 13 17 20 24 20" stroke="#ffa14a" />
        <path d="M8 27C17 27 17 20 24 20" stroke="#f4efe0" />
        <path d="M24 20H32" stroke="#ffffff" />
      </g>
    </svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">Sangam</span>
    </span>
  );
}
