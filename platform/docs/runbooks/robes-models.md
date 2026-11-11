# Preloading the Robes models

The women's five Robes models are portraits Annie chose (7 Nov), not drawings made on demand. They
live in `scripts/migrate/seed/robes-models/` as `w-r1@v2.jpg` … `w-r5@v2.jpg`. A style bump in
`ROBES_MODEL_STYLE` (`packages/core/src/avatar/robes-models.ts`) gives them new catalog keys, so
each environment needs them put in place **before** the code that reads those keys deploys.
Otherwise the first visitor on a Robes model starts five fresh drawings.

The men's five have no seeds. They are drawn once from `ROBES_MODELS` the first time a man's account
stands on a Robes model.

## Steps, per environment (staging first, then production)

Run from `platform/` with that environment's admin database URL and AWS credentials in env, as for
`migrate:rehost` (`docs/migration.md` §3):

```bash
pnpm migrate:robes-models -- --dry-run
```

```bash
TARGET_DATABASE_URL=<admin url> ROBES_MIGRATE_STAGING=<user@host> \
  pnpm migrate:robes-models -- --target=staging --apply --bucket=robes-staging-media-259887029472
```

```bash
TARGET_DATABASE_URL=<admin url> ROBES_MIGRATE_PRODUCTION=<user@host> \
  pnpm migrate:robes-models -- --target=production --apply --bucket=robes-prod-media-259887029472
```

Each run PUTs the five JPEGs to `catalog/avatar/w-rN@v2.jpg` and marks those cells `ready`, over any
pending claim or failed draw. It is safe to run again.

Then merge (staging) or release (production). The `20261107220000_robes_models_v2` migration keeps
every existing pick on the same woman (3 ↔ 4).

## If the code deployed first

Turn off the `model.portraits` flag (`kill-switch.md`, the same `app.feature_flags` update) so no new drawings start, wait ten
minutes for any drawing in flight to finish, run the preload, then turn the flag back on.
