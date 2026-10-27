import { ui } from '@robes/copy';
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

// The sans never goes italic (brand rule): an italic line is Cormorant, never below 17pt.
const italicSize = { body: 20, small: 18, caption: 17 } as const;

export interface TextProps extends RNTextProps {
  size?: keyof typeof sizeClass;
  tone?: Tone;
  weight?: 'regular' | 'medium';
  italic?: boolean;
}

export function Text({
  size = 'body',
  tone = 'ink',
  weight = 'regular',
  italic = false,
  className,
  style,
  ...rest
}: TextProps) {
  // The family rides inline (Uniwind can't name a loaded face), so a `font-display` class must
  // choose it here — otherwise the inline sans wins and a serif line renders in Inter.
  const family = /(^|\s)font-display(\s|$)/.test(className ?? '')
    ? fonts.display
    : weight === 'medium'
      ? fonts.sansMedium
      : fonts.sans;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.body}
      {...rest}
      className={cx(italic ? null : sizeClass[size], toneClass[tone], className)}
      style={
        italic
          ? [style, { fontFamily: fonts.displayItalic, fontSize: italicSize[size] }]
          : [{ fontFamily: family }, style]
      }
    />
  );
}

// The italic phrase inside a Heading ("call <Em>you?</Em>"): iOS has no synthetic italic for a
// loaded face, so the italic family is named, never a fontStyle.
export function Em({ style, ...rest }: RNTextProps) {
  return <RNText {...rest} style={[style, { fontFamily: fonts.displayItalic }]} />;
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

// ROBES in Cormorant caps, tracked wide: the mark, never typed text.
export function Wordmark({ className, style, ...rest }: RNTextProps) {
  return (
    <RNText
      accessibilityRole="header"
      maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
      {...rest}
      className={cx('text-xl uppercase text-ink', className)}
      style={[{ fontFamily: fonts.display, letterSpacing: 6 }, style]}
    >
      {ui.wordmark}
    </RNText>
  );
}

export function Eyebrow({ className, style, ...rest }: RNTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
      {...rest}
      className={cx('text-xs uppercase text-ink-faint', className)}
      style={[{ fontFamily: fonts.sansRegular, letterSpacing: 2.64 }, style]}
    />
  );
}
