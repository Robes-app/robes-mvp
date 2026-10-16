export const aspects = {
  '4:5': 'aspect-4/5',
  '1:1': 'aspect-square',
  '3:4': 'aspect-3/4',
} as const;

export type Aspect = keyof typeof aspects;
