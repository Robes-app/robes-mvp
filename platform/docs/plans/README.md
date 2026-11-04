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
| `2026-09-24-m0-foundations.md` | M0 Foundations | bite-sized | ☑ complete 2026-09-24 (branch `feat/m0-foundations`; see the plan's execution notes) |
| `roadmap.md` → M1 Platform core | schema, infra (CDK), jobs, uploads/media, auth, observability | brief → expand | ☐ |
| `roadmap.md` → M2 Design system & shell | ui/ui-native/copy/icons, IA shell web+native, onboarding, You | brief → expand | ☐ |
| `roadmap.md` → M3 Wardrobe | pieces, capture, analyse, inbox, wishlist, cutouts | brief → expand | ☐ |
| `roadmap.md` → M4 Styling | ai package, Style a piece, composer, Ideas, streaming, lazy images | brief → expand | ☐ |
| `roadmap.md` → M5 Today & Plan | Today's look + overnight batch, Plan, trips, wears | brief → expand | ☐ |
| `roadmap.md` → M6 Profile, sharing, comms, admin, **web cutover** | style analysis, shares, emails, deletion/export, admin, migration | brief → expand | ☐ |
| `roadmap.md` → M7 Native parity & store launch | native gaps, offline, push, share extension, store compliance | brief → expand | ☐ |
| `roadmap.md` → M8 Monetisation (optional) | plans, Stripe, RevenueCat | brief → expand | ☐ |
| `2026-10-28-beta-parity-move-to-staging.md` | Every beta ↔ staging gap (web + native) and the passes to close them so testers move off beta | bite-sized (passes 0–7) | ☐ audit complete 2026-10-28; passes 1–3 are the move bar |
| `2026-11-02-home-ootd-diary.md` | Home → the OOTD diary (strip + one day, prompt chips + wardrobe flyout, bell, day-one band) from the Front Door design, web + native | bite-sized (P0–P4) | ☑ built 2026-11-02 on `feat/home-ootd-diary` (P0–P4, web + native); the server keeps `week`/`home` for installed builds |
| `2026-11-03-prompt-to-draft-look.md` | The prompt box makes one draft look (Front Door 3b): the draft tile in the slot, one draft page for prompt and hand-built drafts, adjusting through the prompt with a stale picture, the rack row carried across; §7 reviews 3k's two-looks day against staging | bite-sized (P0–P4) | ☑ built 2026-11-03 on `feat/prompt-to-draft-look` (P0–P3, D6, D7, web + native); the Create sheet's words keep the deck (§9) |
| `2026-11-04-ios-navigation-redline.md` | The iOS navigation redline: the system tab bar on native, one capsule on a phone's web, the house for Home, no sparkle, the quieter top bar (bell dot, ringed avatar, hairline once scrolled) | record | ☑ built 2026-11-04 (web + native); a device check is listed in the record |

Dependencies: M0 → M1 → (M2 ∥ M3 infra-free parts) → M3 → M4 → M5 → M6 → M7. M2 can start once M1's auth + job system exist. Native screens for M3–M6 are built inside those milestones unless marked web-first.
