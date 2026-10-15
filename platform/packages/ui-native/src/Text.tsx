import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { cx } from './cx';
import { fonts, HEADING_MIN_SIZE, maxFontSizeMultiplier } from './scale';

type Tone = 'ink' | 'muted' | 'faint' | 'danger' | 'success';

const toneClass: Record<Tone, string> = {
  ink: 'text-ink',
  muted: 'text-ink-muted',
  faint: 'text-ink-faint',
  danger: 'text-danger',
  success: 'text-success',
};

const sizeClass = { body: 'text-base', small: 'text-sm', caption: 'text-xs' } as const;

export interface TextProps extends RNTextProps {
  size?: keyof typeof sizeClass;
  tone?: Tone;
  weight?: 'regular' | 'medium';
}

export function Text({
  size = 'body',
  tone = 'ink',
  weight = 'regular',
  className,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.body}
      {...rest}
      className={cx(sizeClass[size], toneClass[tone], className)}
      style={[{ fontFamily: weight === 'medium' ? fonts.sansMedium : fonts.sans }, style]}
    />
  );
}

const headingSize = {
  xl: { className: 'text-5xl', fontSize: 48 },
  lg: { className: 'text-4xl', fontSize: 36 },
  md: { className: 'text-2xl', fontSize: 24 },
  sm: { className: 'text-lg', fontSize: HEADING_MIN_SIZE },
} as const;

export interface HeadingProps extends RNTextProps {
  size?: keyof typeof headingSize;
  weight?: 'light' | 'regular';
  tone?: Tone;
}

// Cormorant never renders below 17pt (brand rule), whatever style is passed.
export function Heading({
  size = 'lg',
  weight = 'light',
  tone = 'ink',
  className,
  style,
  ...rest
}: HeadingProps) {
  const requested = StyleSheet.flatten(style)?.fontSize;
  const fontSize = Math.max(requested ?? headingSize[size].fontSize, HEADING_MIN_SIZE);
  return (
    <RNText
      accessibilityRole="header"
      maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
      {...rest}
      className={cx(headingSize[size].className, toneClass[tone], className)}
      style={[
        style,
        { fontSize, fontFamily: weight === 'regular' ? fonts.displayRegular : fonts.display },
      ]}
    />
  );
}

export function Eyebrow({ className, style, ...rest }: RNTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
      {...rest}
      className={cx('text-xs uppercase tracking-widest text-ink-muted', className)}
      style={[{ fontFamily: fonts.sansMedium }, style]}
    />
  );
}
