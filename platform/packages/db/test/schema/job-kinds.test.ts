import { JOB_KINDS } from '@robes/core';
import { describe, expect, it } from 'vitest';
import { inTx } from '../pg';

describe('generation_jobs kind check', () => {
  it('accepts exactly JOB_KINDS', () =>
    inTx(async (q) => {
      const [row] = await q<{ def: string }>(
        `select pg_get_constraintdef(oid) as def from pg_constraint
         where conname = 'generation_jobs_kind_check'`,
      );
      const kinds = [...(row?.def ?? '').matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
      expect([...kinds].sort()).toEqual([...JOB_KINDS].sort());
    }));
});
