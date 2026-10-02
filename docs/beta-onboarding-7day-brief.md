# The first seven days — onboarding + check-in brief

**Date**: 2026-10-02 (revised the same day: WhatsApp removed, push notifications planned for the native app, Annie's personal emails added) · **Branch**: `beta` · **Status**: brief, nothing built
**Builds on**: `docs/four-session-funnel-brief.md` (the four sessions), slice 6 as built in `notify.js` (the five state-keyed mails + the morning cue), the onboarding split (2026-09-25), the home box as default (2026-10-01).
**Voice**: `robes-voice` rules apply to every line Robes sends. "AI" never appears in anything she reads. Annie's own emails are first person and may name the stage plainly ("one of the first people to use it"), but avoid the words "beta", "MVP" and "platform".

## What this is

A seven-day journey for a newly invited tester, from the invite to the first logged wear, built on two kinds of message:

| Sender | Job | Voice | How it is sent |
|---|---|---|---|
| **Annie, from Gmail** | The invitation and the feedback ask. Sets the week's expectations on day 0, asks how it felt on day 7. | Annie, first person, warm and plain | By hand, from slatteryannie@gmail.com |
| **Robes** | The next step. A picture of hers, one sentence, one deep link into the exact screen. | Robes, editorial, third person | The server (`notifyTick`, Resend), state-keyed |
| **Push** *(phase 2, native app)* | The moment. Short, timely, one tap. Takes over the morning and the "wore it?" beats. | Robes, shortest register | The native app, once built |

**Why no WhatsApp.** Most testers are not personal contacts, and a founder's WhatsApp from an unknown number reads as an intrusion. Email from Annie carries the personal touch. Push carries the timely touch once the native app exists.

**The rhythm.** At most one message a day, of any kind. Robes emails land on days 0, 1, 3, 5 and 6. Annie's emails land on day 0 (before signup) and day 7. Days 2 and 4 are quiet in this phase — they are the slots push fills later.

**Feedback runs all week through three doors**, each named in the invite so she knows they exist:

1. **Reply to any email.** Annie's emails come from her Gmail. Robes mails get a `Reply-To` pointing at Annie (build delta 1), so a reply to any of them reaches her. Every Robes mail ends with one line saying so.
2. **Tell Robes in the box.** Every look carries the look prompt box. "Not the loafers", "too formal", "I'd never wear grey" — the box changes the look, files a standing rule when she states one, and writes the line to her style memory. It is in-app feedback that improves the next look, so it is the door most worth pointing at.
3. **The day-7 ask.** Fifteen minutes on a call, or three questions answered by email.

## The target: what "engaged" means on day 7

The four sessions give the end state. Measured on the `events` table and PostHog (person = Supabase uid):

| Tier | Definition | Session |
|---|---|---|
| **Sparked** | one piece filed, three ways seen, one look saved — on day 0 | 1 |
| **Personalised** | a model on file, the day-0 look rendered on her | 2 |
| **Building** | ≥5 photographed pieces, one look Robes built from hers | 3 |
| **Engaged** | returned on ≥3 distinct days, ≥2 saved looks, ≥1 day dressed or named in the diary, one `wear_confirmed` | 4 |

Pre-commit the numbers before the first cohort runs so the review cannot move the goalposts: Sparked ≥ 80% of signups, Personalised ≥ 50%, Building ≥ 40%, Engaged ≥ 25%. A reading below target on a tier names which day's message to rewrite first.

Two feedback measures sit beside the tiers: the share of testers who reply to any email in the week, and the share who used the look prompt box at least once. Target both at ≥ 30%.

---

## The map — one line per day

| Day | Her state | In-app door that already exists | Message |
|---|---|---|---|
| **0** | Invited → signup → first piece → three ways → a look saved | The styled card; card 01 the one ink; the Filed card's forward line | **Annie: the invite** (Gmail, before signup). **Robes: `looks_ready`** (built) when the frames land, or **`first_piece`** (new) at +4h if nothing was filed |
| **1** | A look saved, no model | The model door on home; the next line's `model` rule | **Robes: `look_waiting`** (built) — or **`pick_one`** (new) if she saw the three ways and built nothing |
| **2** | A model on file, or not | Style notes; the look page's Model view | Quiet. *Push later: the model nudge* |
| **3** | A look borrowing pieces, fewer than five photographed | Swap in yours · N; the briefed add | **Robes: `borrowing`** or **`five`** (both built) |
| **4** | Filing pieces, or stalled | The add flow's batch; the chooser | Quiet. *Push later: the batch nudge* |
| **5** | Pieces filed, nothing in the diary | The home box; the diary; the day page | **Robes: `plan_a_day`** (retuned `week_empty`) |
| **6** | A day dressed, or not | The day page's ✓ Wore it | **Robes: `week_one`** (new) — her week on paper |
| **7** | Whatever she reached | — | **Annie: the feedback ask** (Gmail) |

Robes mails carry `?from=email` (already captured on land). The invite link carries UTM parameters, which PostHog records as initial person properties with no code change.

---

## Day 0 · The invite and the spark

### Annie's invitation (Gmail, before signup)

Sent by hand. One per tester, with her first name. The link's visible text is `beta.byrobes.com`; its address is `https://beta.byrobes.com/?utm_source=invite&utm_medium=email`.

**Subject:** You're invited to Robes
**Alternative subjects:** "One piece, three ways — your invitation" · "Robes: you're one of the first"

> Hi {Name},
>
> I'm building Robes, a styling app that starts with the clothes you already own. I'd love you to be one of the first people to use it.
>
> **Your link: beta.byrobes.com**
>
> It starts with one piece you love. Photograph it, or paste a link from a shop, and Robes shows you three ways to wear it. From there you keep looks, build a model of you to wear them, and plan what you're wearing in a diary. It's made for your phone. Add it to your home screen and it opens like an app.
>
> **Your first week**
>
> I've shaped the first seven days so it takes a few minutes a day, not an afternoon:
>
> - **Today** — add one piece and see it styled three ways. Keep the look you like best.
> - **Days 1–2** — build your model, from two photos or thirty seconds by hand. Every look you keep, she wears.
> - **Days 3–4** — add a handful of pieces. At five, Robes starts building looks from your wardrobe alone.
> - **Days 5–6** — name a day in the diary, like a dinner, the office or the weekend, and Robes dresses it.
> - **Day 7** — wear it, and tap the day to tell Robes you did.
>
> Robes will send you a short email on a few of those days to point you to the next step. Each one has a one-tap stop if you'd rather it didn't.
>
> **What I'd love from you**
>
> Honest feedback, all week, in whatever form is easiest:
>
> - **Reply to this email, or to any email from Robes.** They all come to me, and I read every one.
> - **If a look is wrong, tell Robes in the box under it.** "Not the loafers" or "too formal" both work. It changes the look and remembers for next time.
> - **At the end of the week** I'll ask for fifteen minutes on how it felt: what you used, what you ignored, what annoyed you.
>
> The small irritations are the most useful part, so nothing is too minor to mention.
>
> Thank you for being early.
>
> Annie
> Founder, Robes

**Before the first one goes out**: build delta 1 (the Reply-To) must be live, or the "any email from Robes" promise is false. Until it is, cut that clause to "Reply to this email."

### The product moment

Built and tested: splash → name → the first piece read live → Composing → home with the styled card. See the full looks is the one ink. Build this look opens the composer in situ. Save files the look and the Filed card names the next step. Nothing to add in-app.

One small change on the name screen (consent without a checkbox, decision 1): under "A name for your style notes." add *"Robes sends a few notes over your first week. Stop them from any one."*

### Robes · `looks_ready` (built)

Fires when the three frames land, within 48h of the key piece. Subject "Your three looks are ready." · the three frames · **See the looks** → `/inspiration?open=<id>`. Unchanged. Annie's invite is the welcome; a separate Robes welcome mail would be a second message on day 0 saying less.

### Robes · `first_piece` (new) — only if she signed up and filed nothing

Condition: signed up ≥4h ago, no `key-piece` row, no `wardrobe_items` row, ref `'first'`. Transactional like `looks_ready`.

> **One piece is enough.**
> Your wardrobe starts with one piece you love — a photograph, or a link from a shop. Robes reads it and shows you three ways to wear it.
> **Add your first piece** → `/wardrobe?add=1`

---

## Day 1 · She'd wear it

### Robes · `look_waiting` (built, +24h)

Subject "She'd wear it." · the look's frame · "*{Look}* is in your Lookbook. Build your model once and she wears every look you keep." · **Build your model** → `/stylenotes`. Unchanged.

### Robes · `pick_one` (new) — she saw the three ways and built nothing

Condition: a key piece with three frames, zero `looks` rows, +24h, ref = the kp id. Placed ahead of `look_waiting`.

> **Which one would you wear?**
> {Piece}, worn three ways — they're waiting in your Lookbook. Pick one and Robes builds it around what's yours.
> **See the three** → `/inspiration?open=<id>`

The funnel review found this is where Session 1 leaks: she admires the three-up on her phone and never taps Build.

---

## Day 2 · Quiet

Nothing is sent. The model door is on home and the next line names it. *With push, this is the model nudge (see Push, below).*

---

## Day 3 · Make it yours

### Robes · `borrowing` or `five` (both built)

First match wins in the existing order. `borrowing`: "Robes is borrowing three things." · "*{Look}* borrows a jacket, trousers and shoes. Photograph yours and the look is entirely yours." · **Photograph them** → `/lookbook?open=<id>&fill=1`. `five`: "Robes can build from yours now." → `/lookbook?new=1&robes=1`. Unchanged.

---

## Day 4 · Quiet

Nothing is sent. The add flow takes several photos at once. *With push, this is the batch nudge.* A forwarded receipt is built but not switched on, so do not promise it in any copy until migration 23 and the inbound mail provider are live.

---

## Day 5 · Name a day

### Robes · `plan_a_day` (retune `week_empty`)

Move `week_empty`'s earliest send from +7d to **+5d** (keep the 14-day spacing and the ISO-week ref), and add the morning-line paragraph. Condition unchanged: ≥1 look, nothing in the diary for the next seven days.

> **Nothing planned this week.**
> Name a day and Robes dresses it — tomorrow, Thursday, the dinner you've been thinking about. The diary keeps the week.
> **Open the diary** → `/diary`
>
> *Want a line each morning on the days you've planned? Turn it on in Account details.* → `/dashboard?account=1`

A tester with a day already planned gets nothing on day 5. The morning cue covers her, if she switched it on.

---

## Day 6 · Your week, on paper

### Robes · `week_one` (new, +6d, ref `'week1'`, once)

Her week as Robes read it, in words, with no denominators. Then one CTA, chosen by the first tier she has not reached. The order matches the home next line (model → fill → five → diary → wear), so the mail and the home page never disagree.

> **Your week, on paper.**
> Seven pieces filed. Two looks kept. Your model on file. Thursday dressed.
>
> {one of:}
> · Build your model and she wears every look you keep. → **Build your model** `/stylenotes`
> · *{Look}* still borrows two pieces. Photograph yours and it's entirely yours. → **Swap in yours** `/lookbook?open=<id>&fill=1`
> · Two more pieces and Robes builds from yours alone. → **Add pieces** `/wardrobe?add=1`
> · Name a day and Robes dresses it. → **Open the diary** `/diary`
> · Today is dressed. Tap the day when you've worn it. → **Open today** `/dashboard?d=<today>`
> · Nothing left to set up — the diary keeps the week from here. → **Open Robes** `/dashboard`

Day 6, not 7, so Annie's personal ask on day 7 lands alone.

---

## Day 7 · How did it feel?

### Annie's feedback ask (Gmail)

Sent by hand to everyone who signed up, whatever tier they reached. Reply in the same thread as the invite so she sees the history.

**Subject:** (reply in the invite thread)

> Hi {Name},
>
> That's your first week with Robes. Thank you for giving it a go.
>
> Would you give me fifteen minutes on how it felt? A short call this week is ideal. Reply with a time that suits and I'll send a link. If a call is a stretch, three lines back by email is just as useful:
>
> 1. What did you come back for, if anything?
> 2. Where did you get stuck, or stop?
> 3. If Robes disappeared tomorrow, what would you miss?
>
> Honest beats kind. The things that annoyed you are what I'll fix first.
>
> Annie

### Variant · signed up but went quiet after day 0

> Hi {Name},
>
> I noticed Robes didn't quite stick after the first day, and I'd really like to know why. Was it the setup, the looks, or just not the week for it? One line back is plenty, and it'll shape what I change next.
>
> Annie

### Variant · never signed up (send on day 3, not day 7)

> Hi {Name},
>
> Just bringing this back to the top of your inbox. Your Robes link is beta.byrobes.com. It takes two minutes to see one of your pieces styled three ways. No pressure if the timing's wrong.
>
> Annie

The admin cohort tab (build delta 8) tells Annie which variant each tester gets.

---

## After day 7

The standing sequence carries on: `week_empty` every 14 days while the diary is empty, the morning cue on planned days for anyone who switched it on, `looks_ready` for every new key piece, `receipt_held` once the inbox is live. Annie replies to whatever comes in and initiates nothing further, unless a tester goes quiet for 14 days, which is a different brief.

---

## Push notifications — phase 2, the native app

Push replaces nothing in this phase. When the native app ships, it takes over the beats that are about a moment rather than a next step, and fills the two quiet days.

**Rules to hold when it lands:**

- **Ask for permission after the first saved look, never on first launch.** The Filed card is the moment: "Robes can tell you when your looks are ready, and remind you on the days you've planned." Asked before she has seen any value, iOS permission prompts are mostly declined, and a declined prompt cannot be asked again.
- **At most one message a day across push and email combined.** A kind that moves to push stops sending as email for anyone with push on.
- **Push carries moments; email carries next steps.** The multi-step asks (`look_waiting`, `borrowing`, `week_one`) stay as email, because they need a picture and a sentence.
- **Same consent model** as email: `notification_prefs` gains `push` plus a per-kind switch in Account details.

**What moves to push, with copy** (title · body, both short enough for a lock screen):

| Beat | When | Title | Body | Opens |
|---|---|---|---|---|
| `looks_ready` | frames land | Your three looks are ready. | {Piece}, worn three ways. | the kp result |
| Day 2 model nudge | +48h, no model | She'd wear it. | Build your model and she wears *{Look}*. | `/stylenotes` |
| Day 4 batch nudge | +96h, fewer than five photographed | Two more pieces. | Then Robes builds a look from yours alone. | the add flow |
| Morning cue | her morning hour, a planned day | {Weekday} · {day title} | *{Look}* is ready. | the day page |
| Wore it? | 19:00 local on a dressed day not yet worn | Wore it? | Tap {Thursday} and Robes remembers. | the day page |

The two nudges keep their email fallback for anyone without push.

---

## Build deltas (one Claude Code session)

Nothing sends until `RESEND_API_KEY` is on Railway, `byrobes.com` is verified in Resend, and migration 22 has run. **Those three are the first dependency of the whole plan.**

| # | Delta | Where | Size |
|---|---|---|---|
| 1 | **`Reply-To` on every Robes mail**: a `REPLY_TO` env var (Annie's address) passed as Resend's `reply_to`. Every mail gains the closing line "Reply to this email — it reaches Annie, who reads every one." | `notify.js` `sendMail`, `mailShell`, `mailText` | XS |
| 2 | `first_piece` kind: +4h, no key piece and no wardrobe row, transactional, ref `'first'` | `notify.js` sequence, before `looks_ready` | S |
| 3 | `pick_one` kind: a kp with three frames, zero `looks` rows, +24h, `nudges`, ref = kp id, ahead of `look_waiting` | `notify.js` | S |
| 4 | `week_empty` earliest +7d → +5d; body gains the morning-line paragraph | `notify.js` | XS |
| 5 | `week_one` kind: +6d once, the four counts in words, the CTA by the next-line order | `notify.js` | S–M |
| 6 | A local send window for sequence mails: 08:00–20:00 in her timezone, else hold to the next tick inside it | `notify.js` `notifyTick` | S |
| 7 | `/wardrobe?add=1` opens the add chooser on load, param stripped | `dashboard-personalize.js` `/wardrobe` boot branch | XS |
| 8 | **Admin cohort tab** `/admin#cohort`: one row per profile created in the last 14 days — day N, tier reached, photographed pieces, looks, model, days planned, wears, box asks, mails sent, last event — plus **which of Annie's day-3 / day-7 variants applies** | `public/admin.html`, existing tables + `notifications` | M |
| 9 | The name screen's one line about the week's notes | `onboarding.html` | XS |
| 10 | `notify_smoke` gains the new kinds, the window and the Reply-To header | `scripts/notify_smoke.mjs` | S |

Deliberately not built now: push (waits for the native app), a one-tap "Wore it" from email, and any calendar-day logic. Every send is a state plus an earliest offset, so a tester who moves fast skips mails she doesn't need.

## Measurement — the weekly review

The slice-1 PostHog funnels, one per tier, plus the cohort tab for the row-level read. Every Monday, Annie reads the cohort tab and answers three questions: which tier leaked most, which message lands on the day that tier leaks, and what the replies and box asks said about it. Rewrite that one message. One change a week, then watch the next cohort.

Also watch: `email_sent` against `?from=email` lands per kind (which mail pulls), replies per kind (which mail starts a conversation), and the unsubscribe rate per kind. Above 5% on any kind, cut the mail rather than soften it.

## Open decisions for Annie

1. **Consent.** Recommended: the invite naming the week's emails, plus the name screen's one line, plus the beta terms, together count as informed consent, with a one-tap stop on every mail. Set `nudges: true` at signup for invited accounts if you take this. Today it stays `null` until the styled card's ask.
2. **Reply-To address.** Your Gmail, or a `hello@byrobes.com` mailbox that forwards to it. Recommended: `hello@byrobes.com` forwarding to Gmail. Replies still reach you, and the address survives the day someone else helps answer.
3. **Day 6's CTA order.** Proposed as the home next line's order. If this month's question is the model, move `model` first.
4. **The fifteen minutes.** Recommended: offer both, book a call with anyone who reached Engaged, and take the three lines from the rest.
5. **Push permission copy and timing**, when the native app is scoped. The rule above (after the first saved look) is the recommendation to carry into that build.
