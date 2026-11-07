import { readFile } from 'node:fs/promises';
import { CATALOG_KEY } from '@robes/core/avatar';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { dropDatabase, withClient } from '../src/db';
import { applyRobesModels, planRobesModels } from '../src/robes-models';
import { recreateTarget } from '../src/target';

const NS = process.env.ROBES_DB_NAME ? `${process.env.ROBES_DB_NAME}_` : 'robes_';
const TARGET = `${NS}robes_models_test`;

describe('the Robes models preload', () => {
  it("puts Annie's five women at their catalog keys, one JPEG each", async () => {
    const plan = planRobesModels();
    expect(plan.map((p) => p.cellKey)).toEqual([
      'w-r1@v2',
      'w-r2@v2',
      'w-r3@v2',
      'w-r4@v2',
      'w-r5@v2',
    ]);
    for (const p of plan) {
      expect(p.cellKey).toMatch(CATALOG_KEY);
      expect(p.bucketKey).toBe(`catalog/avatar/${p.cellKey}.jpg`);
      const head = (await readFile(p.file)).subarray(0, 3);
      expect([...head]).toEqual([0xff, 0xd8, 0xff]);
    }
  });

  describe('against a database', () => {
    let url: string;
    beforeAll(async () => {
      url = await recreateTarget(TARGET);
    });
    afterAll(async () => {
      await dropDatabase(TARGET);
    });

    it('marks each portrait ready over a claim or a failed draw, and runs again harmlessly', async () => {
      await withClient(url, (c) =>
        c.query(
          `insert into app.avatar_cells (id, status, claimed_at) values
             ('w-r1@v2', 'pending', now()), ('w-r2@v2', 'failed', now())`,
        ),
      );
      const putObject = vi.fn(async () => {});
      await expect(applyRobesModels(url, { putObject })).resolves.toEqual({
        preloaded: ['w-r1@v2', 'w-r2@v2', 'w-r3@v2', 'w-r4@v2', 'w-r5@v2'],
      });
      expect(putObject).toHaveBeenCalledTimes(5);
      expect(putObject).toHaveBeenCalledWith('catalog/avatar/w-r3@v2.jpg', expect.any(Uint8Array), {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });
      await applyRobesModels(url, { putObject });
      const rows = await withClient(
        url,
        async (c) =>
          (
            await c.query(
              `select id, status, bucket_key, content_type from app.avatar_cells
             where id like 'w-r%' order by id`,
            )
          ).rows,
      );
      expect(rows).toHaveLength(5);
      for (const r of rows) {
        expect(r).toEqual({
          id: r.id,
          status: 'ready',
          bucket_key: `catalog/avatar/${r.id}.jpg`,
          content_type: 'image/jpeg',
        });
      }
    });
  });
});
