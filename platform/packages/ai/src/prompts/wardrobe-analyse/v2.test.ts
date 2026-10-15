import { describe, expect, it } from 'vitest';
import { buildUser as buildUserV1 } from './v1';
import { buildUser, LABEL_RULE, VERSION } from './v2';

describe('wardrobe.analyse v2', () => {
  it('keeps the brand out of the label and changes nothing else', () => {
    const user = buildUser();
    expect(VERSION).toBe(2);
    expect(user).toContain(`${LABEL_RULE}\n`);
    expect(user).toContain('not "Miu Miu ballet sneakers"');
    expect(
      user.replace(
        ' — never the brand; the brand goes in "brand" alone ("Ballet sneakers", not "Miu Miu ballet sneakers")',
        '',
      ),
    ).toBe(buildUserV1());
  });
});
