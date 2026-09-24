import { looks, shell } from '@robes/copy';
import { RouteSegments } from '../route-segments';

const OPTIONS = [
  { value: '/looks', label: shell.segments.saved },
  { value: '/looks/ideas', label: shell.segments.ideas },
] as const;

export function LooksSegments({ current }: { current: '/looks' | '/looks/ideas' }) {
  return <RouteSegments label={looks.title} options={OPTIONS} current={current} />;
}
