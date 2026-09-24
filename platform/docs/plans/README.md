# Robes Platform — Plans Index

## How to work these plans (read this in every new session)

1. Read `platform/CLAUDE.md`, then `docs/SPEC.md`, then the plan for the current milestone.
2. **Plans at bite-sized granularity** (every step has code and commands) are executed with `superpowers:executing-plans`, task by task, committing after each task.
3. **Milestone briefs** in `roadmap.md` are *not* yet bite-sized. At the start of a milestone, expand its brief into `docs/plans/<date>-m<N>-<name>.md` using `superpowers:writing-plans`, using the referenced spec + reference sections, then execute. Do not start coding a milestone from the brief alone.
4. Every task that adds a route, table, external call or screen checks the relevant `SEC-nn` (security.md), `UX-nn` (ux-opportunities §5) and design-system gates, and adds the tests they require.
5. Update the status table below and `platform/CLAUDE.md` "Current milestone" when a milestone exits. Record decisions that change the spec as a new row in `SPEC.md` §4 (ADR) — never silently diverge.
6. Use parallel subagents (`superpowers:dispatching-parallel-agents` / `subagent-driven-development`) for independent tasks (e.g. web screen + native screen of the same feature once the API exists).

## Status

| Plan | Scope | Granularity | Status |
|---|---|---|---|
| `2026-09-24-p0-legacy-hotfixes.md` | Immediate security fixes on the **legacy** `beta`/`main` branches (runs in parallel with M0) | bite-sized | ☐ not started |
| `2026-09-24-m0-foundations.md` | M0 Foundations | bite-sized | ☐ not started |
| `roadmap.md` → M1 Platform core | schema, infra (CDK), jobs, uploads/media, auth, observability | brief → expand | ☐ |
| `roadmap.md` → M2 Design system & shell | ui/ui-native/copy/icons, IA shell web+native, onboarding, You | brief → expand | ☐ |
| `roadmap.md` → M3 Wardrobe | pieces, capture, analyse, inbox, wishlist, cutouts | brief → expand | ☐ |
| `roadmap.md` → M4 Styling | ai package, Style a piece, composer, Ideas, streaming, lazy images | brief → expand | ☐ |
| `roadmap.md` → M5 Today & Plan | Today's look + overnight batch, Plan, trips, wears | brief → expand | ☐ |
| `roadmap.md` → M6 Profile, sharing, comms, admin, **web cutover** | style analysis, shares, emails, deletion/export, admin, migration | brief → expand | ☐ |
| `roadmap.md` → M7 Native parity & store launch | native gaps, offline, push, share extension, store compliance | brief → expand | ☐ |
| `roadmap.md` → M8 Monetisation (optional) | plans, Stripe, RevenueCat | brief → expand | ☐ |

Dependencies: M0 → M1 → (M2 ∥ M3 infra-free parts) → M3 → M4 → M5 → M6 → M7. M2 can start once M1's auth + job system exist. Native screens for M3–M6 are built inside those milestones unless marked web-first.
