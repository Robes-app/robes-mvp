import Svg, { Path } from 'react-native-svg';
import { ICON_STROKE_WIDTH, ICON_VIEWBOX, ICONS, type IconName } from './icons';

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  // Decorative by default; pass a label when the icon is the only content of a control.
  label?: string;
  // Solid shapes for an "on" state (a starred piece, a chosen thumb).
  filled?: boolean;
}

export function Icon({ name, size = 24, color, label, filled = false }: IconProps) {
  return (
    <Svg
      viewBox={ICON_VIEWBOX}
      width={size}
      height={size}
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={ICON_STROKE_WIDTH}
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
    </Svg>
  );
}

export type { IconName };
