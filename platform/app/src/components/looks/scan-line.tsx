// The scanner (legacy 0.5): a rose line sweeping over the piece while its looks compose. Under
// reduced motion it stands still at the top.
export function ScanLine() {
  return (
    <span
      aria-hidden
      data-testid="scan-line"
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent-inspire motion-safe:animate-scan"
    />
  );
}
