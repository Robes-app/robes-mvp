import { describe, expect, it } from 'vitest';
import { asSentence } from './sentence';

describe('asSentence', () => {
  it('capitalises and closes a drafted line, and leaves a finished one alone', () => {
    expect(asSentence('your icons favour structured tailoring')).toBe(
      'Your icons favour structured tailoring.',
    );
    expect(asSentence('You lean into clean lines.')).toBe('You lean into clean lines.');
    expect(asSentence('  ')).toBe('');
  });
});
