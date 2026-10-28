# Asking well — her answers remembered, at most one stop per ask, the rest shown on the look (proposal)

**Date**: 2026-10-28 · **Branch**: `beta` · **Status**: proposal, nothing built
**Why now**: the box asks "Where should the pieces in your look come from?" on every new look (Annie, 28 Oct: repeated every prompt). Liberty's glossary and landscape documents add questions that matter more: the occasion's dress code, and the place and activity ("a coastal path or a seaside lunch"). See `docs/stylist-language-brief.md` §1.3 and §1.6.
**Reads with**: `docs/stylist-language-brief.md` (the resolver that decides what is unclear), `docs/look-prompt-brief.md` (the box). History: 2026-10-19 (second and fourth passes).

## What happens today

`__rbLpSend` holds every new-look ask behind the question whenever `_rbLpBalanceWants(s)` is true: mode `new`, she has filed anything, and no look is attached. That has three problems:

1. **It never remembers.** `s.balance` lives on the box, so the next box asks again. A tester who answers *A mix* forty times has answered once and been asked thirty-nine times more.
2. **It doesn't read her words.** "A casual Thursday, all from my wardrobe" is still asked where the pieces come from. `_rbLpBalanceRead` exists, but it only reads her *answer* to the question, never the ask.
3. **It takes the only slot.** The one-question rule (stylist brief §1.3) means the lowest-value question after the first time crowds out the ones that change the outfit most.

## The principle: two kinds of question

| | About **her** | About **this look** |
|---|---|---|
| Example | Where the pieces come from | Walk or lunch · relaxed or dressed up |
| Changes | rarely | every ask |
| So | **ask once, remember, show it as a control** | **ask only when unclear and it matters; otherwise assume and show** |

The pattern consumer assistants converge on is: remember what's stable; ask only what's unclear and material; for everything else, make a sensible assumption, then show it so it costs one tap to correct. An assumption she can see and change is cheaper than a question she has to answer, and it proves Robes understood her. A question is the expensive tool.

## 1 · Where the pieces come from — asked once, then a chip

- **First new look only** (she has filed something and has no standing answer): asked as today, same copy and chips. *A mix* is first and pre-selected, so the arrow sends straight away.
- **The answer is kept** as `brief.pieces` (`owned` · `mix` · `new`) inside `style_dna`, so there is no migration. It is mirrored to a uid-scoped `localStorage` key so the box reads it with no round trip. **Existing testers are never asked again**: seed `brief.pieces` from their last `balance_answered` (or the newest Suggested set's `kpData.balance`).
- **After that it is a chip, not a question**: one small pill in the box's foot row beside **+**, reading her answer (*All mine* · *A mix* · *New pieces*). A tap shows the three in place and her pick **sticks**: the last one used is the standing answer. One rule, no Settings detour, and she stays in control.
- **Her words win for one ask**: the resolver reads the ask itself ("from my wardrobe", "what I have" → mine; "something new", "to buy", "shopping for" → new; `_rbLpBalanceRead`'s patterns, run on the ask). The chip shows the override for that look and **does not** overwrite the standing answer. This matches the 13 Oct rule that a line typed in a look's box is not a rule.

## 2 · The question budget — at most one stop per ask

The resolver (stylist brief §1.1) proposes questions. The budget decides which are asked:

| Rank | Question | Fires when | Copy · chips (default first, pre-selected) |
|---|---|---|---|
| 1 | **Place / activity** | a landscape that splits (coast, mountains, outdoors, lakeside, resort, country) with no activity named; or "a weekend away" with no place | "A coast walk, or lunch by the sea?" · *Walk* · *Lunch* |
| 2 | **Dress code / mood** | two dress codes read, or an occasion that spans formality with no mood word (date night, drinks, a wedding with no role) | "Relaxed, or dressed up?" · *Relaxed* · *Dressed up* |
| 3 | **Pieces** | her first new look only (§1) | as today |
| — | Weather | **never asked**: fetched for the place she names (stylist brief §1.6) | — |
| — | The day | **never asked**: read from her words (`_rbAskDateFrom`), else undated | — |

**The rules:**
- **One stop, up to two rows.** When several fire, the top two share ONE card, each row pre-answered, and a single tap on the arrow sends both defaults. Never a second round of questions before the look.
- **Below the top two, assume.** Every lower-ranked question gets a reasonable read, shown on the look (§3).
- **Typed words answer what they can.** "Or say it your way" stays. One line ("lunch, dressy") answers both rows.
- **Ignoring it is an answer.** A new ask typed instead takes the defaults.
- **Never asked on**: an edit in the box, "another", ↻ on a tile, a look pinned from **+**, or a second ask in the same thread that already answered it.

```
  A weekend by the sea                          ×
  A coast walk, or lunch by the sea?
  ( Walk ✓ )  ( Lunch )
  Where should the pieces come from?            ← first look only
  ( A mix ✓ )  ( All mine )  ( New pieces )
  [ +  Or say it your way                  → ]
```

In steady state, with pieces remembered and most asks clear, the card appears on a minority of asks and carries one row.

## 3 · The read on show — assume, then let her correct

The look's eyebrow becomes **the read**: what Robes understood, as tappable words. For example: *Thursday · Casual · A mix · 12° London*, or *Saturday · Coast walk · All mine · 14° Cornwall*.

- It replaces the eyebrow the model writes today, so **no new text** is added (design principle 1).
- A tap on one word shows its options in the docked box; a pick re-runs the look as a refine with the changed read. This is the "another" route in stylist brief §3.2, with the read as the adjustment.
- The words are hers where she wrote them ("A casual Thursday" stays verbatim; product invariant on her own words).
- It shows on the generation overlay too, while the look is made, so she sees the assumption before the look lands.

This is where engagement comes from: Robes visibly understood her, and correcting it is one tap, not a form.

## 4 · Learning to ask less

- **Per person**: a question kind she answers with its default **three times running** stops being asked for her. It moves to the read line, and changing it there resets the count.
- **For everyone**: a kind whose default is kept on **≥85%** of asks across testers is demoted to assume-and-show for all.
- The counts live beside `brief.pieces` (`brief.asked: { place: 2, dress: 0 }`), which is small and private to her.

## 5 · How we know it works

Events: `clarify_asked {kinds, surface}`; `clarify_answered {kind, value, was_default, source: chip|typed|skipped}`; `read_changed {kind, from, to}` on the look; `pieces_changed {from, to, standing}` on the chip. The existing `balance_asked` / `balance_answered` events become these.

| Measure | Today | Target after two weeks |
|---|---|---|
| Questions per ask | 1.0 (every ask) | under 0.4 |
| Looks saved per ask | baseline | up |
| Swaps before a save | baseline | down |
| `read_changed` per look | — | low (the assumptions are right) |

## 6 · Copy

Questions are one line, seven words or fewer, in Robes' voice, and never explain why they ask. Chips are one or two words, with the default first and pre-selected. No "to give you better results"; the look is the reason.

## 7 · Build, in slices

| Slice | What | Depends on | Size |
|---|---|---|---|
| Q1 | **Pieces remembered**: `brief.pieces` + cache + seed from history; `_rbLpBalanceWants` false once set; the resolver reads the ask; the foot-row chip; `inspiration_smoke` / `diary_harness` question sections re-pinned (they answer with `__rbLpBalance('mix')` today, so they must set a standing answer instead) | nothing; **fixes the repeat now** | one session |
| Q2 | **The read as the eyebrow**, tap to change → refine | stylist brief slice D's "another" (or a refine with the read) | one session |
| Q3 | **The budget**: place and dress-code rows in one card | stylist brief slices A / P (the resolver) + Liberty's chips (L6) | one session |
| Q4 | **Asking less**: per-person counts, the events, the PostHog funnel | Q1–Q3 | half a session |

## Decisions

1. **Pieces: the last one used sticks** (recommended) — or it changes only for this look, with the standing answer set in Settings.
2. **Up to two rows in one stop** (recommended; only the first look ever carries two) — or strictly one question, with the rest assumed.
3. **The read replaces the eyebrow** (recommended) — or a separate line under it.
4. **Stop asking after three defaults in a row** — the number to tune.
