/**
 * The Moon's lit shape for a tithi (1–30): Shukla tithis wax from the right,
 * Krishna tithis wane, Purnima is full and Amavasya dark. Drawn from the
 * elongation (tithi × 12°), so the icon matches the calculated phase.
 */
export function MoonPhase({ tithi, size = 16, className }: { tithi: number; size?: number; className?: string }) {
  const elongation = ((tithi - 0.5) / 30) * 2 * Math.PI; // middle of the tithi
  const waxing = tithi <= 15;
  const cos = Math.cos(elongation);
  const rx = Math.abs(cos) * 9;
  const crescent = cos > 0; // less than half lit
  // Outer limb on the lit side, then back along the terminator ellipse.
  const outerSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const d = `M12 3 A9 9 0 0 ${outerSweep} 12 21 A${rx.toFixed(2)} 9 0 0 ${termSweep} 12 3 Z`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`moonphase${className ? ` ${className}` : ""}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="mp-dark" />
      {tithi !== 30 && <path d={d} className="mp-lit" />}
      <circle cx="12" cy="12" r="9" className="mp-rim" />
    </svg>
  );
}
