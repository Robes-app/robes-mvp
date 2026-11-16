import { piece } from './fixtures';

// A look as a render job draws it: once the picture is asked for, the next read says it is being
// drawn, and the read after says it has landed, its picture ready with its renditions. Robes asks
// about a change only once the picture wears it (16 Nov), so a test that waits for the question
// waits for this.
export function drawnOnAsk<T extends object>(look: T, jobId: string) {
  let stage: 'idle' | 'asked' | 'drawing' | 'landed' = 'idle';
  return {
    get: () => {
      if (stage === 'asked') {
        stage = 'drawing';
        return { ...look, onModel: 'pending' };
      }
      if (stage === 'drawing') stage = 'landed';
      return stage === 'landed'
        ? { ...look, onModel: 'ready', model: piece().image, image: piece().image }
        : look;
    },
    render: () => {
      stage = 'asked';
      return { jobId, status: 'queued' };
    },
  };
}
