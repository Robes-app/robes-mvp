import Svg, { Path } from 'react-native-svg';
import { ICON_SOLID, ICON_STROKE_WIDTH, ICON_VIEWBOX, ICONS, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
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
  color,
  label,
  filled = false,
  stroke = ICON_STROKE_WIDTH,
}: IconProps) {
  return (
    <Svg
      viewBox={ICON_VIEWBOX}
      width={size}
      height={size}
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={Boolean(label)}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      {ICONS[name].map((d) => (
        <Path key={d} d={d} />
      ))}
      {ICON_SOLID[name]?.map((d) => (
        <Path key={d} d={d} fill={color} />
      ))}
    </Svg>
  );
}

export type { IconName };
