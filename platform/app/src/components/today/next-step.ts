import type { Today } from '@robes/contracts';
import { type NextDoorTarget, nextLine } from '@robes/copy';

// The shared next-step line with web routes for its door.
export function nextStepCopy(t: Pick<Today, 'nextStep' | 'today'>): {
  text: string;
  door: { label: string; href: string } | null;
} {
  const { text, door } = nextLine(t.nextStep);
  if (!door) return { text, door: null };
  const look = t.today.find((e) => !e.worn)?.entry.look;
  const routes: Record<NextDoorTarget, string | null> = {
    addPieces: '/wardrobe/add',
    newLook: '/looks/new',
    todayLook: look ? `/look/${look.id}` : null,
    plan: '/plan',
    model: '/you/model',
  };
  const href = routes[door.target];
  return { text, door: href ? { label: door.label, href } : null };
}
