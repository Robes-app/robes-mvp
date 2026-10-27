// Look states, the keep-or-pass deck and the look prompt (legacy beta 2026-10-01 → 10-13).
// en-GB, curly apostrophes, Robes in the third person, no exclamation marks.

const pieces = (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`);
const KEPT_WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const ROLE = { canvas: 'Canvas', anchor: 'Anchor', texture: 'Texture', exclamation: 'Exclamation' };
const line = (parts: (string | null)[]): string => parts.filter(Boolean).join(' · ');

// What a saved look says about itself: its rack, its wears, when it was last worn
// and the piece it was styled around.
export interface LookFacts {
  pieces: number;
  timesWorn: number;
  lastWorn: string | null;
  around: string | null;
}

export const lookbook = {
  title: 'Lookbook',
  tabs: { saved: 'Saved', suggested: 'Suggested' },
  count: {
    looks: (n: number): string => (n === 1 ? '1 look' : `${n} looks`),
    inProgress: (n: number): string => `${n} in progress`,
    suggested: (n: number): string => `${n} suggested`,
  },
  newLook: 'New look',
  sort: {
    label: 'Sort',
    newest: 'Newest',
    lastWorn: 'Last worn',
    name: 'Name',
  },
  inProgress: 'In progress',
  draftTile: {
    eyebrow: 'Draft',
    untitled: 'Untitled',
    meta: (when: string): string => `Not saved · started ${when}`,
    // The In progress row's small card (native parity canvas): the dashed frame says unsaved.
    started: (when: string): string => `Started ${when}`,
  },
  suggestedTile: {
    eyebrow: 'Suggested',
    around: (piece: string): string => `Around your ${piece}`,
    fromPrompt: 'From your prompt',
    // The mark on a look styled from her own words; the piece's mark names the piece.
    quote: '“',
    yourPiece: (piece: string): string => `Your ${piece}`,
    remove: (name: string): string => `Remove ${name}`,
    swap: (name: string): string => `Swap ${name} for another look`,
    framing: 'Creating the frame…',
    restyling: 'Changing the look…',
  },
  removed: 'Removed',
  passed: 'Passed',
  swapFailed: 'Robes couldn’t swap that look — please try again in a moment.',
  savedEmpty: {
    title: 'Looks you keep live here.',
    body: 'Save one Robes suggests, or start one from your pieces.',
  },
  suggestedEmpty: {
    title: 'Nothing suggested yet.',
    body: 'Ask Robes for a look, or style one of your pieces three ways.',
  },
  // The look page, in each state.
  eyebrow: {
    suggested: 'Suggested',
    suggestedAround: (piece: string): string => `Suggested · around your ${piece}`,
    suggestedPrompt: 'Suggested · from your prompt',
    draft: 'Draft look',
    draftFromSuggestion: 'Draft · from Robes’ suggestion',
    saved: 'Saved look',
    editing: 'Editing',
  },
  meta: {
    pieces,
    notYetWorn: 'Not yet worn',
    wears: (n: number): string => (n === 1 ? '1 wear' : `${n} wears`),
    lastWorn: (when: string): string => `last ${when}`,
    around: (piece: string): string => `around your ${piece}`,
    photographOnly: 'Photograph · not yet filed',
    // One line of facts, built from the same words wherever a saved look says them.
    // On a card the wears LEAD — how often a look actually gets worn is the card's
    // job in a lookbook she browses; the look page leads with its rack instead.
    card: (f: LookFacts): string =>
      line([
        f.timesWorn ? lookbook.meta.wears(f.timesWorn) : lookbook.meta.notYetWorn,
        pieces(f.pieces),
        f.lastWorn ? lookbook.meta.lastWorn(f.lastWorn) : null,
        f.around ? lookbook.meta.around(f.around) : null,
      ]),
    saved: (f: LookFacts): string =>
      line([
        pieces(f.pieces),
        f.timesWorn ? lookbook.meta.wears(f.timesWorn) : lookbook.meta.notYetWorn,
        f.lastWorn ? lookbook.meta.lastWorn(f.lastWorn) : null,
        f.around ? lookbook.meta.around(f.around) : null,
      ]),
  },
  composedByRobes: 'Composed by Robes',
  noteLabel: 'The look',
  // The Lookbook's Filter drawer (legacy Refine): the axes a saved look can be narrowed by.
  refine: {
    open: 'Filter',
    title: 'Filter',
    clear: 'Clear all',
    show: (n: number): string => `Show ${n} ${n === 1 ? 'look' : 'looks'}`,
    season: 'Season',
    seasons: {
      spring_summer: 'Spring / Summer',
      autumn_winter: 'Autumn / Winter',
      year_round: 'Year-round',
    },
    none: 'Nothing in this edit.',
    on: 'Filters on',
  },
  card: {
    diary: 'Put this look in the diary',
    delete: 'Delete this look',
  },
  bar: {
    save: 'Save',
    saveToLookbook: 'Save to lookbook',
    edit: 'Edit',
    discard: 'Discard',
    editLook: 'Edit look',
    addPieces: '+ Add pieces',
    done: 'Done',
    update: 'Update look',
    notForYou: 'Not for you',
  },
  saved: 'Saved to your lookbook',
  addedToDay: (day: string): string => `In your plan for ${day}.`,
  // Save opens the diary every time (legacy 0.2); closing it is "not yet" and writes nothing.
  // The diary sheet is beta's month (legacy _lkDiaryPaint): any day is one tap, a day gone by
  // records it as worn, and the CTA says which of those it is about to do.
  diary: {
    title: 'Put it in the diary',
    eyebrow: 'Put in the diary',
    notYet: 'Not yet',
    pick: 'Pick a day',
    add: (day: string): string => `Add to ${day}`,
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    // "Today, Friday 17 October · records it as worn"
    picked: (long: string, today: boolean, suffix: 'worn' | 'filed' | null): string =>
      `${today ? 'Today, ' : ''}${long}${
        suffix === 'worn'
          ? ' · records it as worn'
          : suffix === 'filed'
            ? ' · something already filed'
            : ''
      }`,
    put: 'Put it in the diary',
    already: 'Already in the diary · Open the day',
    record: 'Record it as worn',
    recorded: 'Already worn that day',
    woreToday: 'I wore this today',
    woreTodayDone: 'Worn today ✓',
    recordedOn: (day: string): string => `Recorded — worn ${day}`,
    inDiaryFor: (look: string, day: string): string => `“${look}” is in your diary for ${day}`,
  },
  discarded: 'Draft let go.',
  name: {
    label: 'Name this look',
    placeholder: 'Untitled',
  },
  // The draft stands on a figure (legacy 2026-10-15): a slot per part of her, tapped to dress.
  figure: {
    untitled: 'Untitled Look',
    head: (n: number): string => `The look · ${pieces(n)}`,
    alt: 'Your model, ready to dress',
    slots: { top: '+ Top', bottom: '+ Bottom', shoes: '+ Shoes' },
    // The empty draft's start bar (legacy 2026-10-15 second pass): two icon CTAs in one pill.
    start: { photo: 'Start from a photo', pieces: 'Add pieces' },
  },
  rack: {
    title: (n: number): string => `The rack · ${pieces(n)}`,
    addPiece: '+ Add a piece',
    notYours: 'Not yours yet',
    wishlist: 'Wishlist',
    swappedIn: (was: string): string => `Swapped in · was ${was}`,
    backIn: 'Back in · from the prompt',
    added: 'Added',
    roles: ROLE,
    open: (name: string): string => `Open ${name}`,
    swap: (name: string): string => `Swap ${name}`,
    save: (name: string): string => `Save ${name} to your wishlist`,
    remove: (name: string): string => `Remove ${name} from this look`,
    empty: 'Nothing hangs here yet.',
    addWorn: 'Add the pieces you wore',
  },
  guide: {
    title: 'Start with the canvas',
    body: 'The basics that set proportion and tone.',
    hint: 'A tee, jeans, a knit…',
  },
  swap: {
    title: (piece: string): string => `Swap the ${piece}`,
    add: 'Add a piece',
    all: 'All',
    swapIn: (name: string): string => `Swap in ${name}`,
    addIn: (name: string): string => `Add ${name}`,
    empty: 'Nothing else of this kind in your wardrobe.',
    // A swap on a suggested look lands at once, behind Undo.
    swapped: (name: string): string => `${name} is on the look.`,
  },
  drafts: {
    fullTitle: 'Five drafts are waiting.',
    fullBody: (oldest: string): string => `“${oldest}” is the oldest. A new look lets it go.`,
    letGo: 'Let it go',
    keep: 'Keep them',
    discardTitle: 'Let the draft go?',
    discardBody: (name: string): string => `“${name}” isn’t saved.`,
  },
  // Keep or pass (legacy F14).
  deck: {
    eyebrowAround: (piece: string): string => `Around your ${piece}`,
    eyebrowFor: (day: string): string => `For ${day}`,
    eyebrowPrompt: 'From your prompt',
    titleAround: (piece: string): string => `Your ${piece},`,
    titlePrompt: 'Your ask,',
    titleTail: 'three ways.',
    // No twin: the top card's own badge carries the door, so the deck says nothing here.
    modelYours: 'Each look, shot on your model.',
    composing: 'Robes is composing',
    yourPiece: (piece: string): string => `Your ${piece}`,
    // The scanner's lines while a look composes (legacy 0.5). Three lists, one per surface
    // ("Generating a look" is legacy's first line; chrome says "Styling a look").
    // Around a piece she handed Robes.
    scanPiece: [
      'Styling a look',
      'Looking at the hem',
      'Choosing the shoes',
      'Finding a layer',
      'Weighing the bag',
      'Setting the colour',
    ],
    // From her words alone.
    scanPrompt: [
      'Styling a look',
      'Reading your words',
      'Choosing the pieces',
      'Setting the tone',
      'Finding the shoes',
      'Weighing a layer',
    ],
    // Before the set lands. Only this one says who wears the looks, and only until her twin is
    // filed — the deck's own lists never carry it.
    scanOverlay: ['Styling a look', 'Choosing the shoes', 'Finding a layer', 'Setting the colour'],
    scanGeneric: 'On a Robes model for now',
    // On a suggested look's frame while she has no model; it opens the build-your-model door.
    genericModel: 'Generic model',
    genericModelLabel: 'Generic model — see every look on you',
    // The badge's own drawer (legacy design 1a): it opens here, never a navigation. Closing it
    // changes nothing, so an undecided deck stays where it was.
    twin: {
      eyebrow: 'Generic model',
      title: 'See every look',
      titleEm: 'on you.',
      body: 'Two photos — a close-up, and full length in good light. Robes builds your digital twin, and dresses her in every look.',
      upload: 'Upload digital twin',
      keep: 'Keep styling on the generic model',
    },
    teach: 'Swipe left to pass, right to keep.',
    keep: 'Keep',
    pass: 'Pass',
    pieces,
    kept: (n: number): string =>
      n === 0
        ? 'No suggested looks kept.'
        : `${KEPT_WORDS[n] ?? String(n)} suggested ${n === 1 ? 'look' : 'looks'} kept.`,
    see: 'See Suggested',
    backHome: 'Back home',
    backTo: (piece: string): string => `Back to the ${piece}`,
    noneAgainPiece: 'Style it three ways again from the piece page.',
    noneAgainPrompt: 'Ask Robes again from the prompt box.',
    failed: 'Robes couldn’t compose these looks. Try again in a moment.',
  },
  // The look prompt: one box on every look.
  prompt: {
    doorLook: 'Change this look…',
    doorNew: 'Where to, and how should it feel?',
    doorAfter: 'Anything else, or put something back…',
    doorDraft: 'Change this draft…',
    busyChange: 'Changing the look…',
    busyRead: 'Reading it…',
    busyNote: 'Noting it…',
    doneNone: 'Nothing has changed yet, so there’s nothing to put back.',
    noticed: 'Waiting under Robes noticed — keep it there and it becomes a rule.',
    drafted: 'Robes wrote this from your words. Edit it, or press Enter.',
    send: 'Send',
    fold: 'Close',
    label: (name: string): string => `Change ${name}`,
    newLabel: 'A new look',
    failed: 'Robes couldn’t read that just now. Try again.',
    // The one question on a new look: where its pieces come from.
    balance: {
      question: 'Where should the pieces in your look come from?',
      owned: 'All mine',
      mix: 'A mix',
      new: 'Suggest new pieces',
      typed: 'Or say it your way',
    },
  },
  // F8: a verdict on a suggestion lands in her memory; "not quite" lets it go.
  verdict: {
    title: 'How was this look?',
    sub: 'Your taste shapes what comes next',
    up: 'Loved it',
    down: 'Not quite',
    ask: 'What would have made it better?',
    send: 'Send',
    noted: 'Noted — the next ones will lean that way.',
  },
  pieceRail: 'Robes suggested',
  // The piece page's two ways in (legacy piece card modes).
  startLook: 'Start a look with it',
  suggestThree: 'Robes suggests three',
} as const;
