# Robes — "Your Model" · Design Brief for Claude Design

**Date:** 25 August 2026 · **From:** the avatar render proposal (`docs/avatar-render-proposal.md`, decision recorded §3.3)
**Ask:** design the four surfaces below, desktop (1280px) + mobile (390px). Engineering is settled; this brief is self-contained — don't assume access to the codebase.

---

## What this feature is

Robes reads a woman's colouring and line from her Style Notes analysis and proposes **her model** — a consistent, editorial figure drawn from a curated set. Once she saves her, every look she keeps renders as one photograph of her model wearing it. The existing flat-lay mosaic of her pieces stays underneath as "the pieces", and is the loading state and the fallback.

**Decided entry model (do not redesign this):** nothing in onboarding. With an analysis on file, Robes *proposes* one model — she saves or adjusts. Without one, she's invited to start with her colouring in Style Notes, or takes a ten-second quick pick (skin tone + hair swatches on one neutral figure). Both paths end at the same model and the same adjust sheet.

## Design system (the app's own — use exactly)

- Ground cream `#FAF8F5` · ink `#202021` · rose `#8E6A7C` (eyebrows/labels) · sage `#4A7B6F` (quiet positive)
- Hairlines `#E1DACB` on white cards, 2–4px radii on panels; **CTAs and pills are 100px rounded**
- Selected states: warm cream `#F3EFE6` fill + `#C9BCA6` border + small ink check — never heavy black fills
- Type: Cormorant Garamond display (serif, italic emphasis), Inter for UI; small-caps eyebrows at ~10–11px/.24em
- **One filled dark button per screen** — it marks the single real commitment
- Section headers: eyebrow left, one quiet action right, hairline beneath
- Mobile shell is <768px; bottom sheets size with `dvh` + safe-area insets

## The four surfaces

**1 · The reveal.** The moment after a Style Notes analysis lands (plus a one-time dashboard card for women already analysed). Full-length model on the cream ground, a line saying she was drawn from her colouring and her line, one dark CTA that keeps her, and a quiet "Not quite her?" door into the adjust sheet. This is a wow moment — give it air; it's also Style Notes' payoff, so it should feel like an arrival, not a form.

**2 · The adjust sheet.** A row of ~8 skin tones (swatches, warm→cool, deep→fair), a row of 5 hair colours (swatches), and for the figure **directional word-pair nudges only** — e.g. "softer / straighter", "fuller / narrower" — that quietly redraw her. Tapping a swatch updates the model in place. Desktop: modal or side panel; mobile: bottom sheet. One dark Save.

**3 · The invitation + quick pick** (no analysis yet). A quiet card: "Meet your model — start with your colouring" → Style Notes; beneath it the impatient path: pick a skin tone and a hair colour (same swatch rows), done. **Never a grid of model figures to choose between.**

**4 · The look, worn.** Look detail + Lookbook card with the render as the hero image (4:5), the mosaic beneath it as "The pieces". States: *composing* (mosaic shows immediately, one quiet serif-italic line that her look is being fitted — it takes ~30–40s); *ready* (render leads); *failed / no model yet* (mosaic alone, silently — no error state ever shows).

Plus a one-liner: Account details gains a collapsible "Your model" row (same pattern as the existing "How do you identify?" field) reopening the adjust sheet.

## Hard rules

- The phrase **"body type" never appears**, and there is never a lineup of bodies/figures to compare herself against. Figure changes only via the word-pair nudges.
- Never "AI" in copy — "Robes", "your stylist", "drawn for you". **"Avatar" is also engine vocabulary** — the working consumer name is *your model*; propose better if you have it.
- Register: warm, editorial, minimal, confident. Core ethos: *wear more, buy less.*
- The mosaic is never removed from a surface — it is the one view that cannot be wrong.
- The skin-tone row must read as genuinely inclusive at a glance — the range is the point, not an option.

## Out of scope

Onboarding (untouched), the admin approval queue, men's set, any settings beyond the Account details row.
