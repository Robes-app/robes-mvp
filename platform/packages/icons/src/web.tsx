import { ICON_SOLID, ICON_STROKE_WIDTH, ICON_VIEWBOX, ICONS, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  // Decorative by default; pass a label when the icon is the only content of a control.
  label?: string;
  // Solid shapes for an "on" state (a starred piece, a chosen thumb).
  filled?: boolean;
  // Felix thins a glyph in some places (the bell 1.2, sheet rows 1.4); 1.5 by default.
  stroke?: number;
}

export function Icon({
  name,
  size = 24,
  className,
  label,
  filled = false,
  stroke = ICON_STROKE_WIDTH,
}: IconProps) {
  return (
    <svg
      viewBox={ICON_VIEWBOX}
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
      {ICON_SOLID[name]?.map((d) => (
        <path key={d} d={d} fill="currentColor" />
      ))}
    </svg>
  );
}

export type { IconName };
