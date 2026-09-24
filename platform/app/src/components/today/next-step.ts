import type { Today } from '@robes/contracts';
import { today as copy } from '@robes/copy';

// The next-step rule → sentence + door (legacy _rbNextLine). Pure, so it's unit-tested.
export function nextStepCopy(t: Pick<Today, 'nextStep' | 'today'>): {
  text: string;
  door: { label: string; href: string } | null;
} {
  const step = t.nextStep;
  if (!step) return { text: copy.next.none, door: null };
  switch (step.rule) {
    case 'start':
      return {
        text: copy.next.start.text,
        door: { label: copy.next.start.door, href: '/wardrobe/add' },
      };
    case 'five':
      return {
        text: copy.next.five.text(step.remaining ?? 1),
        door: { label: copy.next.five.door, href: '/wardrobe/add' },
      };
    case 'build':
      return {
        text: copy.next.build.text,
        door: { label: copy.next.build.door, href: '/looks/new' },
      };
    case 'wear': {
      const look = t.today.find((e) => !e.worn)?.entry.look;
      return {
        text: copy.next.wear.text,
        door: look ? { label: copy.next.wear.door, href: `/look/${look.id}` } : null,
      };
    }
    case 'week':
      return { text: copy.next.week.text, door: { label: copy.next.week.door, href: '/plan' } };
  }
}
