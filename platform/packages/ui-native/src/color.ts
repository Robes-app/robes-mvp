import { dark, light, palette, type Semantic } from '@robes/tokens';
import { useUniwind } from 'uniwind';

function resolve(theme: 'light' | 'dark', name: Semantic): string {
  const ref = (theme === 'dark' ? dark : light)[name];
  if (typeof ref === 'string') return palette[ref];
  const hex = palette[ref.base];
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${ref.alpha})`;
}

// Raw colour for props that can't take a className (SVG stroke, ActivityIndicator).
export function useColor(name: Semantic): string {
  const { theme } = useUniwind();
  return resolve(theme === 'dark' ? 'dark' : 'light', name);
}

export { resolve as resolveColor };
