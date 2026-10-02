# The first seven days — onboarding + check-in brief

**Date**: 2026-10-02 · **Branch**: `beta` · **Status**: brief, nothing built
**Builds on**: `docs/four-session-funnel-brief.md` (the four sessions), slice 6 as built in `notify.js` (the five state-keyed mails + the morning cue), the onboarding split (2026-09-25), the home box as default (2026-10-01).
**Voice**: `robes-voice` rules apply to every line below. "AI" and "beta" never appear in anything she reads; the invite link is `beta.byrobes.com` and that is the only place the word survives.

## What this is

A seven-day journey for a newly invited tester, from the invite to the first logged wear, with one touch a day across two channels. It is not a drip campaign: every message is **state-keyed** (sent only when the product state says she is at that step), **one a day at most**, and **each channel has one job**:

| Channel | Job | Voice | Who sends |
|---|---|---|---|
| **Email** | The artifact. A picture of hers, one sentence, one deep link into the exact screen. | Robes, editorial, third person | The server (`notifyTick`, Resend) |
| **WhatsApp** | The person. A question from Annie that gets a reply. | Annie, first person, short | Annie, by hand, from a WhatsApp Business number |

The two never fire on the same day except day 0 (the invite) and day 7 (the close). Email days are 0 · 1 · 3 · 5 · 7. WhatsApp days are 0 · 2 · 4 · 6 · 7. She hears from Robes every day for a week, and never twice in a day.

**Why WhatsApp is manual in this phase.** At closed-beta scale (tens of testers) a founder's thumb beats a template. The WhatsApp Business Platform needs approved templates, a BSP (Twilio or similar), and per-message cost, and it strips the one thing WhatsApp is for here: a reply. Move to the API only when the cohort passes roughly a hundred and the reply rate has been read. Until then the WhatsApp thread IS the user-research log.

## The target: what "engaged" means on day 7

The four sessions give the end state. Measured on the `events` table and PostHog (person = Supabase uid):

| Tier | Definition | Session |
|---|---|---|
| **Sparked** | one piece filed, three ways seen, one look saved — on day 0 | 1 |
| **Personalised** | a model on file, the day-0 look rendered on her | 2 |
| **Building** | ≥5 photographed pieces, one look Robes built from hers | 3 |
| **Engaged** | returned on ≥3 distinct days, ≥2 saved looks, ≥1 day dressed or named in the diary, one `wear_confirmed` | 4 |

A tester who reaches **Engaged by day 7** is the funnel working. A tester who reaches **Building** and stops is the diary's problem, not onboarding's. A tester who never leaves **Sparked** is the day-1/day-2 problem — the model door.

Pre-commit the numbers before the first cohort runs so the review cannot move the goalposts: Sparked ≥ 80% of signups (the onboarding flow already carries this), Personalised ≥ 50%, Building ≥ 40%, Engaged ≥ 25%. Reading below that on any tier names which day's message to rewrite first.

---

## The map — one line per day

| Day | Her state (the product) | In-app door that already exists | Email | WhatsApp |
|---|---|---|---|---|
| **0** | Invited → signup → name → first piece → Composing → home with the styled card → See the full looks → Build this look → Save | The styled card; card 01 the one ink; the notes door; the Filed card's forward line | `looks_ready` (built) when the frames land. **Fallback** `first_piece` (new) at +4h if nothing was filed | **The invite** (before signup) — the link, what to do first, one question |
| **1** | A look saved, no model | The model door on home; the next line's `model` rule | `look_waiting` (built, +24h): "She'd wear it." **Branch** `pick_one` (new) if the three ways were seen and no look was built | — |
| **2** | A model on file, or not | Style notes chapters; the look page's Model view | — | "Did she come out like you?" — branch on the model |
| **3** | A look borrowing pieces, <5 photographed | The rack's Swap in yours · N; the briefed add | `borrowing` (built, +72h) / `five` (built) — first match wins | — |
| **4** | Filing pieces, or stalled | The add flow's batch; the chooser's three ways in | — | The batch nudge — branch on photographed count |
| **5** | Pieces filed, nothing in the diary | The home box ("A new look for…"); the diary; the day page | `plan_a_day` (retune `week_empty` from +7d to +5d, add the morning-line ask) | — |
| **6** | A day dressed, or not | The day page's ✓ Wore it; the home week strip | — | "Did it go out the door?" — branch on a dressed day |
| **7** | Whatever she reached | — | `week_one` (new): her first week on paper, one CTA by tier | The fifteen-minute ask |

Every email carries `?from=email` (captured today as a PostHog prop and stripped on land). Every WhatsApp link carries `?from=whatsapp` — a one-line generalisation of `_rbEmailLand`, see the build deltas.

---

## Day 0 · The spark

**The product moment.** This is built and tested (`onboarding_harness` 150/150): splash → name → the first piece read live → Composing with the real titles → home. The styled card leads; See the full looks is the one ink; the kp page's card 01 is filled; Build this look opens the composer in situ; Save files the look and the Filed card names Session 2 ("Build your model and she'll wear it."). Nothing to add in-app for day 0.

**One change to the name screen** (consent without a checkbox, see decision 1): under "A name for your style notes." add the quiet line *"Robes sends a few notes over your first week. Stop them from any one."* The one-click unsubscribe on every mail is already built; the privacy notice already names the mails. This makes the sequence informed from the first screen without a form field on the one screen that must stay effortless.

### WhatsApp · the invite (sent by Annie, before signup)

The thread exists before the account does — that is what makes every later WhatsApp a continuation, not a cold message.

> Hi {Name} — here's your Robes link: beta.byrobes.com
>
> It starts with one piece you love. Photograph it (or paste a shop link) and Robes shows you three ways to wear it. Two minutes, phone is fine.
>
> Tell me what you picked?

One question. The reply tells Annie the piece, which is the day-2 message's opener.

### Email · `looks_ready` (built)

Fires on the tick after the three frames land, within 48h of the key piece. Subject "Your three looks are ready." · the three frames · "See the looks" → `/inspiration?open=<id>`. Unchanged. This is the welcome mail; a separate "Welcome to Robes" would be a second message on day 0 saying less.

### Email · `first_piece` (new) — the skip branch only

Condition: signed up ≥4h ago, no `key-piece` lookbook row, no `wardrobe_items` row, `first_piece` not yet sent (ref `'first'`). Transactional like `looks_ready` (no `nudges` gate — she started something and left it).

> **One piece is enough.**
> Your wardrobe starts with one piece you love — a photograph, or a link from a shop. Robes reads it and shows you three ways to wear it.
> **Add your first piece** → `/wardrobe?add=1`

`?add=1` is new: the `/wardrobe` boot branch opens `WA.open({way:'choose'})` once the wardrobe has loaded and strips the param (the `?receipts=1` precedent).

---

## Day 1 · She'd wear it

**The product moment.** The model door on home (`#rb-model-door`), the next line's `model` rule ("Build your model and she'll wear *{look}*."), the Style notes chapters behind `/stylenotes`. Filing the model lands her back on the day-0 look, dressed (slice 2.2). All built.

### Email · `look_waiting` (built, +24h)

Subject "She'd wear it." · the look's frame · "*{Look}* is in your Lookbook. Build your model once and she wears every look you keep." · "Build your model" → `/stylenotes`. Unchanged.

### Email · `pick_one` (new) — the branch where she saw the three ways and built nothing

Condition: a `key-piece` row with three frames, zero `looks` rows, +24h, `nudges` consent. Ref = the kp id. Outranks `look_waiting` (which needs a look) and stands down once a look exists.

> **Which one would you wear?**
> {Piece}, worn three ways — they're waiting in your Lookbook. Pick one and Robes builds it around what's yours.
> **See the three** → `/inspiration?open=<id>`

Reuses the `looks_ready` frames. The gap this closes: a tester who opened the three-up on her phone, admired it, and never tapped Build. The funnel review found this is where Session 1 actually leaks.

---

## Day 2 · Did she come out like you?

**The product moment.** The model page: two photographs or thirty seconds by hand; auto-files; Build a look lands on the day-0 look rendered on her. Built.

### WhatsApp (Annie) — branch on `profiles.avatar_id`

Model on file:

> Saw your model's on file — did she come out close? If anything's off, the Adjust pill on the model page fixes skin and hair in a tap.
>
> (And your {piece} — did one of the three looks feel like you?)

No model:

> The thing I'd do next: build your model. Two photographs, or thirty seconds by hand if photographs feel like a lot — then every look you keep is a picture of you wearing it.
>
> beta.byrobes.com/stylenotes?from=whatsapp

Dormant (no sign-in since day 0): the same no-model text, with the first line swapped for "No rush — the link's the same whenever you're ready."

Every day-2 message reads the piece she named in the day-0 reply. That is why the invite asks.

---

## Day 3 · Make it yours

**The product moment.** A saved look borrowing pieces carries **Swap in yours · N** on its rack head; the briefed add opens on the gap ("Make *{look}* yours." / "Looking for: a blazer · loafers"), each filed piece lands on the look. At five photographed pieces the composer's Robes door and the `robes` next line appear. All built.

### Email · `borrowing` (built, +72h) or `five` (built)

First match wins in the existing order. `borrowing`: "Robes is borrowing three things." · "*{Look}* borrows a jacket, trousers and shoes. Photograph yours and the look is entirely yours." · "Photograph them" → `/lookbook?open=<id>&fill=1`. `five`: "Robes can build from yours now." → `/lookbook?new=1&robes=1`. Unchanged.

---

## Day 4 · The batch

**The product moment.** The add flow takes several photographs at once and files them one after another; the chooser offers a photograph, a shop link, or no photo. (A forwarded receipt is built but not switched on — migration 23 and the inbound mail provider are not live. **Do not promise it in copy until both are.**)

### WhatsApp (Annie) — branch on photographed pieces

Under five:

> Five pieces is where Robes starts building looks from your own wardrobe, no prompt needed. Quickest way there: a few photos at once from the camera roll — Robes files them one after another.
>
> What's the piece you wear most? Start with that one.

Five or more, no `robes_build_opened` event:

> You're past five — did you let Robes build one from yours yet? It's the pill beside Save on a new look. Curious what it picks for you.

Robes build opened:

> Robes built one from your wardrobe — did it get you right, or was something off? One line back is plenty.

The third branch is a verdict ask. The product has its own thumbs line on every look; a WhatsApp reply is the fuller version, and Annie files it as a `feedback` row from the admin if it should count.

---

## Day 5 · Name a day

**The product moment.** The home box reads "A new look for…"; a dated ask lands a draft under the field and Save files it to the day; the diary's day page carries the three doors; the week strip shows one dot per look. Built. The morning cue exists, opt-in only, through Account details → Emails.

### Email · `plan_a_day` (retune `week_empty`)

`week_empty` already does this at +7d. Move its earliest send to **+5d** (keep the 14-day spacing and the ISO-week ref), and add the morning line as a second paragraph. Condition unchanged: ≥1 look, no `planned_days` row in the next seven days.

> **Nothing planned this week.**
> Name a day and Robes dresses it — tomorrow, Thursday, the dinner you've been thinking about. The diary keeps the week.
> **Open the diary** → `/diary`
>
> *Want a line each morning on the days you've planned? Turn it on in Account details.* → `/dashboard?account=1`

The second link is a text link, not a second button — one ink CTA per mail is the shell's rule.

A tester who already has a day planned by day 5 gets nothing on day 5. That is correct: the morning cue is the day-6 touch for her, if she switched it on.

---

## Day 6 · Did it go out the door?

**The product moment.** The day page's **✓ Wore it**; the wear lands on the look and on every owned piece (`times_worn`), which is what "wear more, buy less" is measured on. Built.

### WhatsApp (Annie) — branch on `planned_days`

A day dressed today or yesterday:

> Did {the look} go out the door? Tap the day and Robes remembers it — that's how it learns what you actually reach for.

Nothing dressed:

> What's on this week — anything you'd like dressed? Tell me the day and the thing and I'll show you where it goes.

The second branch is concierge: Annie walks her into the diary by hand. In this phase that is the right cost, and the replies are the diary's own usability test.

---

## Day 7 · On paper

### Email · `week_one` (new, +7d, ref `'week1'`, once)

Her first week as Robes read it. Numbers in words, no denominators, no ladders. Then one CTA, chosen by the first tier she has NOT reached — the server-side twin of the home next line's order (model → fill → five → diary → wear).

> **Your first week, on paper.**
> Seven pieces filed. Two looks kept. Your model on file. Thursday dressed.
>
> {one of:}
> · Build your model and she wears every look you keep. → **Build your model** `/stylenotes`
> · *{Look}* still borrows two pieces. Photograph yours and it's entirely yours. → **Swap in yours** `/lookbook?open=<id>&fill=1`
> · Two more pieces and Robes builds from yours alone. → **Add pieces** `/wardrobe?add=1`
> · Name a day and Robes dresses it. → **Open the diary** `/diary`
> · Today is dressed. Tap the day when you've worn it. → **Open today** `/dashboard?d=<today>`
> · Nothing left to set up — the diary keeps the week from here. → **Open Robes** `/dashboard`

The lines are the product's own: `_rbNextLine`'s text, word for word, so the mail and the home page never disagree.

### WhatsApp (Annie) — the ask

> That's a week. Would you give me fifteen minutes this week on how it felt — what you reached for, what you ignored, what annoyed you? A call or three lines back, whichever is easier.

This is where the beta earns its interviews. Nothing else goes out on day 7.

---

## After day 7

The standing sequence carries on without anything new: `week_empty` every 14 days while the diary is empty, the morning cue on planned days for anyone who switched it on, `looks_ready` for every new key piece, `receipt_held` once the inbox is live. WhatsApp drops to **replies only** — Annie answers, never initiates, unless a tester goes quiet for 14 days, which is a different brief.

---

## Build deltas (one Claude Code session)

Everything below rides `notify.js` and the smoke; the client deltas are small. Nothing sends until `RESEND_API_KEY` is on Railway, `byrobes.com` is verified in Resend, and migration 22 has run — **those three remain the first dependency of this whole plan.**

| # | Delta | Where | Size |
|---|---|---|---|
| 1 | `first_piece` kind: +4h, no key piece and no wardrobe row, transactional (no `nudges` gate), ref `'first'` | `notify.js` sequence, before `looks_ready` | S |
| 2 | `pick_one` kind: a kp with three frames, zero `looks` rows, +24h, `nudges`, ref = kp id; placed ahead of `look_waiting` | `notify.js` | S |
| 3 | `week_empty` earliest +7d → +5d; body gains the morning-line paragraph with the `/dashboard?account=1` text link | `notify.js` | XS |
| 4 | `week_one` kind: +7d once, the four counts in words (`_msWord` is client-side — port the ten-word table), the CTA chosen by the next-line order | `notify.js` | S–M |
| 5 | A local **send window** for sequence mails: 08:00–20:00 in `notification_prefs.timezone`, else hold to the next tick inside the window (the morning cue already reads the timezone) | `notify.js` `notifyTick` | S |
| 6 | `/wardrobe?add=1` → `WA.open({way:'choose'})` on load, param stripped | `dashboard-personalize.js` `/wardrobe` boot branch | XS |
| 7 | `?from=` captured for any value (`email`, `whatsapp`), not only `email` — `_rbEmailLand` becomes `_rbFromLand`; PostHog prop `from` | `dashboard-personalize.js`, `stylenotes.html` | XS |
| 8 | The name screen's one-line notice about the week's notes | `onboarding.html` | XS |
| 9 | **Admin cohort view**: `/admin#cohort` — one row per profile created in the last 14 days: day N, photographed pieces, looks, model, days planned, wears, last event, mails sent (from `notifications`), and **today's WhatsApp branch** derived from the same states (so Annie opens the tab each morning and sends what it names) | `public/admin.html`, reads existing tables + `notifications` | M |
| 10 | `notify_smoke` gains the four kinds, the window, and the day-7 CTA ladder | `scripts/notify_smoke.mjs` | S |

Deliberately NOT built: WhatsApp automation (manual by design in this phase), a one-tap "Wore it" from mail (phase 2 of slice 6), web push, any "day N" calendar logic — every send is a state plus an earliest offset, as slice 6 already does, so a tester who moves fast skips mails she does not need and a tester who stalls gets the one that fits.

## Measurement — the weekly review

One PostHog insight per tier (the slice-1 funnels, already defined), plus the admin cohort tab for the row-level read. The ritual: every Monday, Annie reads the cohort tab and answers three questions — which tier leaked most this week, which message landed on the day that tier leaks, and what the WhatsApp replies said about it. Rewrite that one message. One change a week, then watch the next cohort.

Signals to watch that are not tiers: `email_sent` vs `?from=email` lands per kind (which mail pulls), WhatsApp reply rate per day (which question earns an answer), and the unsub rate per kind (which mail reads as noise — above 5% on any kind means cut it, not soften it).

## Open decisions for Annie

1. **Consent.** Recommended: the invite conversation plus the name screen's one line plus the beta terms = informed consent for the week's mails, with one-click stop on every one. The alternative is a checkbox on signup, which costs the one screen that must stay effortless. Set `nudges: true` on invited accounts at signup if you take the recommendation; today it is `null` until the styled card's ask.
2. **The WhatsApp number.** A WhatsApp Business profile on a Robes number (free, manual) or Annie's own. Recommended: a Robes number — it survives the day the sending moves off Annie's phone, and the profile can carry the wordmark.
3. **Who gets the invite thread.** Everyone invited, or only testers you know personally. Recommended: everyone — the invite text is the one message that needs no reply to work.
4. **Day 7's CTA order.** Proposed as the next line's order. If the beta's question this month is the model, move `model` ahead of everything on day 7 as well.
5. **The fifteen minutes.** A call, or three questions by text. Recommended: offer both, book the call for anyone who reached Engaged, take the text from the rest.
