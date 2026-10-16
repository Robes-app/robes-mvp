import { Text } from '@robes/ui';

// Swatch colours are her profile's data (hex from the style catalog), not design tokens, so they
// are the one place a colour comes from an inline style.
export function Swatches({
  label,
  swatches,
}: {
  label: string;
  swatches: { name: string; hex: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Text size="small" tone="muted">
        {label}
      </Text>
      <ul aria-label={label} className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <li key={s.name} className="flex w-16 flex-col items-center gap-1">
            <span
              aria-hidden
              className="size-10 rounded-full border border-hairline"
              style={{ backgroundColor: s.hex }}
            />
            <Text size="small" className="text-center">
              {s.name}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  );
}
