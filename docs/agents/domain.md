# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## This repo: single-context

- **`GLOSSARY.md`** at the repo root is the vocabulary for both apps (legacy beta and the platform) and the cutover between them.
- **`architecture-decisions.md`** at the repo root holds the ADRs, numbered `ADR-001`, `ADR-002`, … in one file. There is no `docs/adr/` directory; a new ADR is a new numbered section at the end of that file.
- **`docs/legacy-app-history.md`** is the dated reasoning behind every legacy surface (newest first). Read the newest entry for a surface before changing it; a later entry supersedes an earlier one.
- **`platform/CLAUDE.md`** governs work under `platform/`; the root `CLAUDE.md` governs the legacy app.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`architecture-decisions.md`**: read ADRs that touch the area you're about to work in.
- For a legacy surface, the newest `docs/legacy-app-history.md` entry naming it.

If a file referenced above is missing, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── GLOSSARY.md                  ← shared vocabulary
├── architecture-decisions.md    ← ADR-001, ADR-002, … (one file, not docs/adr/)
├── docs/legacy-app-history.md   ← dated reasoning per legacy surface
├── platform/CLAUDE.md           ← rules for the platform app
└── docs/agents/                 ← this file, issue-tracker.md, triage-labels.md
```

`platform/packages/*` is a workspace, but it shares the root glossary and ADR file; there are no per-package glossaries. Switch to a root `GLOSSARY-MAP.md` with per-context `GLOSSARY.md` files only if the platform's vocabulary diverges from the legacy app's.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-001 (weekly track removed), but worth reopening because…_
