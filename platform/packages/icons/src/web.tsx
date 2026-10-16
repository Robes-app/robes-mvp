import { ICON_STROKE_WIDTH, ICON_VIEWBOX, ICONS, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  // Decorative by default; pass a label when the icon is the only content of a control.
  label?: string;
  // Solid shapes for an "on" state (a starred piece, a chosen thumb).
  filled?: boolean;
}

export function Icon({ name, size = 24, className, label, filled = false }: IconProps) {
  return (
    <svg
      viewBox={ICON_VIEWBOX}
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={ICON_STROKE_WIDTH}
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
    </svg>
  );
}

export type { IconName };
