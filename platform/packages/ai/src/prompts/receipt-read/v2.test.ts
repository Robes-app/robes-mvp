import { describe, expect, it } from 'vitest';
import { LABEL_RULE } from '../wardrobe-analyse/v2';
import { SYSTEM as SYSTEM_V1 } from './v1';
import { SYSTEM, VERSION } from './v2';

describe('inbox.receipt v2', () => {
  it('keeps the brand out of the label and changes nothing else', () => {
    expect(VERSION).toBe(2);
    expect(SYSTEM).toContain(`${LABEL_RULE}\n`);
    expect(SYSTEM).not.toBe(SYSTEM_V1);
    expect(SYSTEM.length - SYSTEM_V1.length).toBe(
      LABEL_RULE.length - LABEL_RULE.indexOf(' — never'),
    );
  });
});
