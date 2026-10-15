import { BRIEF_KEPT_MAX } from '@robes/core/style-dna';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BriefListFull } from '../../src/errors';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { styleBrief, styling } = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;

beforeAll(async () => {
  ann = await createTestUser(db, 'Ann Lee');
  bea = await createTestUser(db, 'Bea Ray');
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

const lines = async (userId: UserId) => (await repos.styleDna.get(userId)).lines;

describe('style DNA repos', () => {
  it('saves taste and facts on her profile only', async () => {
    await repos.styleDna.updateTaste(ann, {
      styleArchetypes: ['Minimal'],
      styleBrands: ['The Row', 'COS'],
      styleIcons: ['Hailey Bieber'],
      investmentLevel: '500_1500',
    });
    await repos.styleDna.setFacts(ann, {
      heightCm: 168,
      sizeUk: 10,
      shoeUk: 5.5,
      ageBand: '45_54',
    });
    const got = await repos.styleDna.get(ann);
    expect(got.profile).toMatchObject({
      styleBrands: ['The Row', 'COS'],
      investmentLevel: '500_1500',
      heightCm: 168,
      sizeUk: 10,
      shoeUk: 5.5,
      ageBand: '45_54',
    });
    await repos.styleDna.setFacts(ann, { shoeUk: null });
    expect((await repos.styleDna.get(ann)).profile?.shoeUk).toBeNull();
    expect((await repos.styleDna.get(bea)).profile).toMatchObject({
      styleBrands: [],
      investmentLevel: null,
      heightCm: null,
    });
  });

  it('adds her own lines once, and × takes a typed line away for good', async () => {
    expect(await repos.styleDna.addLine(ann, 'avoids', 'Heels', 'Heels')).toBe(true);
    expect(await repos.styleDna.addLine(ann, 'avoids', ' heels ')).toBe(false);
    const heels = (await lines(ann)).find((l) => l.text === 'Heels');
    expect(heels).toMatchObject({ state: 'kept', source: 'typed', chip: 'Heels' });
    expect(await repos.styleDna.removeLine(bea, heels?.id ?? '')).toBe(false);
    expect(await repos.styleDna.removeLine(ann, heels?.id ?? '')).toBe(true);
    expect((await lines(ann)).some((l) => l.text === 'Heels')).toBe(false);
    expect(await repos.styleMemory.recent(ann)).toEqual([]);
  });

  it('files what Robes noticed on Keep, strikes it on Not me and never offers it again', async () => {
    await styleBrief.saveRead(ann, [
      { list: 'loves', text: 'You reach for a defined waist', because: 'your belted coats' },
      { list: 'rules', text: 'Loafers only with a cropped trouser', because: 'three looks' },
      { list: 'notes', text: 'You dress well.', fullText: 'You dress well. Structure first.' },
      {
        list: 'colours',
        text: 'You reach for navy.',
        loved: ['navy'],
        rejected: ['mustard'],
      },
    ]);
    const pending = (await lines(ann)).filter((l) => l.state === 'pending');
    expect(pending.map((l) => l.list)).toEqual(['loves', 'rules', 'notes', 'colours']);
    const id = (list: string) => pending.find((l) => l.list === list)?.id ?? '';

    expect(await repos.styleDna.keepPending(bea, id('loves'))).toBe(false);
    expect(await repos.styleDna.keepPending(ann, id('loves'))).toBe(true);
    expect(await repos.styleDna.keepPending(ann, id('notes'))).toBe(true);
    expect(await repos.styleDna.keepPending(ann, id('colours'))).toBe(true);
    expect(await repos.styleDna.dismissPending(bea, id('rules'))).toBe(false);
    expect(await repos.styleDna.dismissPending(ann, id('rules'))).toBe(true);

    const got = await repos.styleDna.get(ann);
    expect(got.lines.map((l) => [l.list, l.state, l.source])).toEqual([
      ['loves', 'kept', 'drafted'],
    ]);
    expect(got.style?.briefNotes).toBe('You dress well. Structure first.');
    expect(got.style?.userOverrides).toMatchObject({
      loved_colors: ['navy'],
      rejected_colors: ['mustard'],
    });
    expect(got.style?.briefReadAt).toBeInstanceOf(Date);
    const memory = await repos.styleMemory.recent(ann);
    expect(memory).toMatchObject([{ kind: 'strike', body: 'Loafers only with a cropped trouser' }]);

    // A struck line never returns, from a read or from the look prompt.
    await styleBrief.saveRead(ann, [
      { list: 'rules', text: 'loafers only with a cropped trouser' },
      { list: 'loves', text: 'You reach for a defined waist' },
    ]);
    expect((await lines(ann)).filter((l) => l.state === 'pending')).toEqual([]);
    expect(
      await repos.styleDna.notice(ann, {
        list: 'rules',
        text: 'Loafers only with a cropped trouser',
      }),
    ).toBe(false);
  });

  it('lets a rule said in passing wait, and a read keep it waiting', async () => {
    expect(
      await repos.styleDna.notice(ann, {
        list: 'rules',
        text: 'No double denim',
        because: 'You said it on “Saturday”',
      }),
    ).toBe(true);
    expect(await repos.styleDna.notice(ann, { list: 'rules', text: 'no double denim' })).toBe(
      false,
    );
    await styleBrief.saveRead(ann, [{ list: 'avoids', text: 'Nothing sheer' }]);
    const pending = (await lines(ann)).filter((l) => l.state === 'pending');
    expect(pending.map((l) => [l.text, l.origin])).toEqual([
      ['No double denim', 'prompt'],
      ['Nothing sheer', 'read'],
    ]);
    // Typing a line Robes was waiting on keeps it.
    expect(await repos.styleDna.addLine(ann, 'rules', 'No double denim')).toBe(true);
    expect((await lines(ann)).find((l) => l.text === 'No double denim')?.state).toBe('kept');
    expect((await lines(bea)).length).toBe(0);
  });

  it('caps kept lines per list at BRIEF_KEPT_MAX, for typed and kept lines alike', async () => {
    const cal = await createTestUser(db, 'Cal Cap');
    try {
      await db
        .insertInto('styleBriefLines')
        .values(
          Array.from({ length: BRIEF_KEPT_MAX }, (_, i) => ({
            userId: cal,
            list: 'rules',
            state: 'kept',
            text: `Rule ${i}`,
            keptAt: new Date(),
          })),
        )
        .execute();
      // A line already standing is still a no-op, not a full list.
      expect(await repos.styleDna.addLine(cal, 'rules', 'rule 3')).toBe(false);
      await expect(repos.styleDna.addLine(cal, 'rules', 'One too many')).rejects.toBeInstanceOf(
        BriefListFull,
      );
      expect(await repos.styleDna.notice(cal, { list: 'rules', text: 'Waiting rule' })).toBe(true);
      const waiting = (await lines(cal)).find((l) => l.text === 'Waiting rule');
      await expect(repos.styleDna.keepPending(cal, waiting?.id ?? '')).rejects.toBeInstanceOf(
        BriefListFull,
      );
      expect((await lines(cal)).filter((l) => l.state === 'kept')).toHaveLength(BRIEF_KEPT_MAX);
      // Other lists, and other people, have their own room.
      expect(await repos.styleDna.addLine(cal, 'loves', 'Navy')).toBe(true);
      expect(await repos.styleDna.addLine(bea, 'rules', 'One too many')).toBe(true);
      await db.deleteFrom('styleBriefLines').where('userId', '=', bea).execute();
    } finally {
      await deleteTestUsers(db, cal);
    }
  });

  it('records her memory, reads her wears with it and never another user’s look', async () => {
    const look = await repos.looks.create(ann, {
      name: 'Office armour',
      nameProvisional: false,
      pieces: [],
    });
    const beaLook = await repos.looks.create(bea, {
      name: 'Bea look',
      nameProvisional: false,
      pieces: [],
    });
    await repos.looks.wear(ann, look.id, '2026-10-01');
    await repos.styleMemory.record(ann, {
      kind: 'verdict',
      verdict: 0,
      subject: 'Harbour Dinner',
      body: 'too safe',
      lookId: beaLook.id,
    });
    await repos.styleMemory.record(ann, {
      kind: 'swap',
      pieceOut: 'Tan loafers',
      pieceIn: 'Black flats',
      category: 'Shoes',
    });
    const recent = await repos.styleMemory.recent(ann);
    expect(recent.map((e) => e.kind)).toEqual(['swap', 'verdict', 'wear', 'strike']);
    expect(recent.find((e) => e.kind === 'wear')).toMatchObject({
      subject: 'Office armour',
      pieces: 0,
    });
    const verdict = await db
      .selectFrom('styleMemory')
      .select('lookId')
      .where('userId', '=', ann)
      .where('kind', '=', 'verdict')
      .executeTakeFirst();
    expect(verdict?.lookId).toBeNull();
    expect(await repos.styleMemory.recent(bea)).toEqual([]);
    expect(await repos.styleMemory.unreadCount(ann)).toBe(2);
    expect(await repos.styleMemory.unreadCount(bea)).toBe(0);
  });

  it('gives every prompt her brief, memory, brands, level and facts', async () => {
    const ctx = await styling.context(ann);
    expect(ctx.styleDna).toMatchObject({
      brief: { loves: ['You reach for a defined waist'], rules: ['No double denim'] },
      brands: ['The Row', 'COS'],
      investment: '€500–1,500',
      facts: { height_cm: 168, size_uk: 10, shoe_uk: null, age_band: '45–54' },
      icon_tags: { 'Hailey Bieber': 'Clean-girl minimal' },
    });
    expect((ctx.styleDna.memory.entries[0] as { k: string }).k).toBe('swap');
    const other = await styling.context(bea);
    expect(other.styleDna).toMatchObject({ brief: { loves: [] }, memory: { entries: [] } });
  });

  it('compiles the read’s evidence from her rows alone', async () => {
    await repos.wardrobe.create(ann, { label: 'Camel coat' });
    await repos.wardrobe.create(bea, { label: 'Bea coat' });
    const ev = await styleBrief.evidence(ann);
    expect(ev.wardrobe.map((w) => w.label)).toEqual(['Camel coat']);
    expect(ev.looks.map((l) => [l.name, l.wears])).toEqual([['Office armour', 1]]);
    expect(ev.struck).toEqual(['Loafers only with a cropped trouser']);
    expect(ev.kept.map((l) => l.text)).toContain('No double denim');
    expect((await styleBrief.evidence(bea)).looks.map((l) => l.name)).toEqual(['Bea look']);
  });
});
