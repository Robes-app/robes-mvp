import { type Semantic, semanticColor } from '@robes/tokens';
import { useUniwind } from 'uniwind';

// Raw colour for props that can't take a className (SVG stroke, ActivityIndicator).
export function useColor(name: Semantic): string {
  const { theme } = useUniwind();
  return semanticColor(theme === 'dark' ? 'dark' : 'light', name);
}

export { semanticColor as resolveColor };
