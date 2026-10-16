// One dot per look, three at most: rose up to today, ink for a day still ahead (legacy ff87e89).
export function DayDots({ looks, past }: { looks: number; past: boolean }) {
  const n = Math.min(3, looks);
  return (
    <span aria-hidden className="flex h-1.5 gap-1">
      {Array.from({ length: n }, (_, i) => (
        <i
          // biome-ignore lint/suspicious/noArrayIndexKey: identical dots
          key={i}
          className={`block size-1.5 rounded-pill ${past ? 'bg-accent-inspire' : 'bg-ink'}`}
        />
      ))}
    </span>
  );
}
