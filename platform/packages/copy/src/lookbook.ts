// Look states, the keep-or-pass deck and the look prompt (legacy beta 2026-10-01 → 10-13).
// en-GB, curly apostrophes, Robes in the third person, no exclamation marks.

const pieces = (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`);
const TO_FIND_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'] as const;
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
  // The saved look page only: the next day it is pinned on ("Wednesday 28 Oct").
  pinnedFor?: string | null;
}

export const lookbook = {
  title: 'Lookbook',
  tabs: { saved: 'Saved', suggested: 'Suggested' },
  newLook: 'New look',
  // The New Look sheet (Front Door PRD rev 3 §5.5): three doors on glass.
  newLookSheet: {
    describe: 'Describe',
    photo: 'Photo',
    fromPieces: 'From pieces',
  },
  // The Lookbook's hidden search, revealed by a pull (PRD Q6).
  search: 'Search your looks',
  inProgress: 'In progress',
  draftTile: {
    eyebrow: 'Draft',
    untitled: 'Untitled',
    // The In progress row's card (Look redline 27 Oct): it says it isn't saved.
    meta: (when: string): string => `Not saved · started ${when}`,
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
    // The bookmark on a suggestion's photograph (Front Door PRD rev 3 §5.3) saves it to Saved.
    save: (name: string): string => `Save ${name}`,
    saved: (name: string): string => `${name} is saved`,
    // Why Robes suggested it, under the name (core suggestionReason).
    reason: {
      day: (weekday: string): string => `For ${weekday}`,
      wishlist: 'Works with your wishlist',
      own: (n: number): string => (n === 1 ? 'Uses 1 piece you own' : `Uses ${n} pieces you own`),
      wearMost: 'Built from what you wear most',
    },
    framing: 'Creating the frame…',
    restyling: 'Changing the look…',
  },
  removed: 'Removed',
  passed: 'Passed',
  swapFailed: 'Robes couldn’t swap that look — please try again in a moment.',
  // Front Door PRD rev 3 §5.4.
  savedEmpty: {
    title: 'No saved looks yet',
    body: 'Describe a look, start from a photo or build one from your pieces. Looks you save from Suggested land here too.',
  },
  noMatch: 'No looks match',
  suggestedEmpty: {
    title: 'Nothing suggested yet.',
    body: 'Tell Robes where you’re going, or pick a piece, and it dresses you.',
  },
  // The look page, in each state.
  eyebrow: {
    suggested: 'Suggested',
    suggestedAround: (piece: string): string => `Suggested · around your ${piece}`,
    suggestedPrompt: 'Suggested · from your prompt',
    draft: 'Draft look',
    draftFromSuggestion: 'Draft · from Robes’ suggestion',
    saved: 'Saved look',
    // Once her words or her hands have changed it and the picture is behind (design 3b).
    editing: 'Saved look · changed',
  },
  meta: {
    pieces,
    notYetWorn: 'Not yet worn',
    wears: (n: number): string => (n === 1 ? '1 wear' : `${n} wears`),
    lastWorn: (when: string): string => `last ${when}`,
    around: (piece: string): string => `around your ${piece}`,
    pinnedFor: (day: string): string => `pinned for ${day}`,
    photographOnly: 'Photograph · not yet filed',
    // The Lookbook card (Front Door PRD rev 3 §5.2): the wears, or New, then the seasons.
    frontDoor: (wears: number, seasons: readonly string[], yearRound: string): string =>
      `${wears > 0 ? wears : 'New'} · ${seasons.length ? seasons.join(', ') : yearRound}`,
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
        f.pinnedFor ? lookbook.meta.pinnedFor(f.pinnedFor) : null,
      ]),
  },
  composedByRobes: 'Composed by Robes',
  noteLabel: 'The look',
  // The text block over a look's picture (plan 2026-11-03 §1.3): what it is made of.
  mix: (yours: number, toFind: number): string =>
    toFind === 0 ? `The look · ${pieces(yours)}` : `The look · ${yours} yours, ${toFind} to find`,
  card: {
    diary: 'Put this look in the diary',
    delete: 'Delete this look',
    // A look with pieces still to find (Front Door PRD rev 3 §5.2): the small bag on the card.
    shop: 'Includes pieces to find',
  },
  // The saved look as Felix 3e (plan 2026-11-06 D8–D10): the photo with its three discs, Pieces ·
  // Details, and one Schedule look. Web components/looks/saved-look.tsx and look-details.tsx;
  // native features/looks/SavedLook.tsx and LookDetails.tsx.
  savedLook: {
    tabs: { pieces: 'Pieces', details: 'Details' },
    back: 'Back',
    adjust: 'Adjust model image',
    // The image stack badge: the count of her photographs, or + before the first.
    images: 'Images of this look',
    schedule: 'Schedule look',
    edit: 'Edit look',
    // Editing's foot (D9): Delete is a destructive reveal, asked before it runs.
    deleteTitle: 'Delete this look?',
    deleteBody: 'It leaves your Lookbook and the days it is on.',
    delete: 'Delete',
    cancel: 'Cancel',
    // The image manager: a strip of cards over the photo until Done.
    manager: {
      title: 'Images of this look',
      robes: 'Robes’ picture',
      photo: (n: number): string => `Photograph ${n}`,
      add: 'Add a photo',
      remove: 'Remove this image',
      done: 'Done',
      // 409 look_needs_image (D19): the change would leave the look with no image.
      lastImage: 'A look keeps at least one image.',
      // 409 upload_in_use on uploads.discard: the photo is already on a look, so it stays.
      inUse: 'This photo is on a look, so it stays.',
    },
    details: {
      tags: 'Tags',
      seasons: 'Seasons',
      worn: 'Worn',
      caption: 'Caption',
      none: 'None',
      yearRound: 'Year round',
      notWorn: 'Not worn yet',
      // "5 times · last 27 Oct"
      wornSummary: (n: number, last: string | null): string =>
        `${n === 1 ? '1 time' : `${n} times`}${last ? ` · last ${last}` : ''}`,
      editCaption: 'Edit the caption',
      captionPlaceholder: 'Add a caption',
      clearCaption: 'Clear the caption',
      saveCaption: 'Keep the caption',
    },
    tagsView: {
      title: 'Tags',
      add: 'Add a tag',
      keep: 'Keep the tag',
      toggle: (tag: string): string => `Tag it ${tag}`,
    },
    seasonsView: {
      title: 'Seasons',
      names: {
        spring: 'Spring',
        summer: 'Summer',
        autumn: 'Autumn',
        winter: 'Winter',
      } as const,
      yearRound: 'Year round',
    },
    wornView: {
      title: (n: number): string =>
        n === 0 ? 'Worn' : n === 1 ? 'Worn · 1 time' : `Worn · ${n} times`,
      none: 'Not worn yet',
      add: '+ Add a date',
    },
  },
  // The draft drawer (Felix DraftLook, plan 2026-11-06 D14): one drawer over whatever started it,
  // for a draft and for a saved look's edit. Its three sheets feed the one thread.
  draftLook: {
    title: 'Draft look',
    editTitle: 'Edit look',
    newName: 'New look',
    close: 'Close',
    // The done disc: Save on a draft; on a saved look's edit it only closes, once nothing waits
    // for Update look (D18).
    done: 'Save look',
    doneEdit: 'Done',
    // A saved look's one accept (3e's pill, the Edit look drawer's footer; D17, D18).
    update: 'Update look',
    doneForDay: 'Save and schedule for this day',
    // The styling card (Front Door PRD rev 3 §4.6): the prompt row's placeholders turn while it
    // is empty; a saved look's row asks for the change instead.
    placeholder: 'Describe look…',
    placeholders: [
      'dinner date, smart casual…',
      'the office, a long day…',
      'a walk, then lunch…',
      'drinks after work…',
    ],
    editPlaceholder: 'more casual…',
    // The sticky primary at the foot (PRD §4.6 draws it as GENERATE ✓), in Robes' words: Robes
    // styles, it never generates (the voice guard in index.test.ts).
    generate: 'Style it',
    // The Shop toggle (PRD §4.6, plan R1): off keeps the look to her wardrobe; on lets Robes reach
    // for her wishlist and new pieces. What a reader hears for each state.
    shop: {
      label: 'Shop',
      on: 'Shop is on: looks can include your wishlist and new pieces',
      off: 'Shop is off: looks use your wardrobe pieces only',
    },
    // The Rack card before the first piece (PRD §4.6): with a wardrobe it opens the picker; empty
    // it opens Add your pieces. The heading shows once a piece hangs.
    rack: 'The Rack',
    // The pencil on The Rack (PRD §6.1, plan R2): edit-pieces mode shows each row's swap and ×;
    // at rest a row opens its piece.
    editPieces: 'Edit pieces',
    rackCard: {
      eyebrow: 'Your wardrobe',
      pick: 'Pick from your wardrobe',
      orRobes: 'Or let Robes style below',
      add: 'Add your pieces',
      ways: 'Photo, link or receipt',
    },
    // Describe's day draft: the job behind Style it ended without a look (D22).
    styleFailed: 'Robes couldn’t style that one. Try again in a moment.',
    thread: 'Your words on this look',
    // The context chip: the day's place and weather, read from the diary.
    context: (place: string, range: string): string => `${place} · ${range}`,
    // Delete, in edit mode (D9).
    delete: 'Delete this look',
    adjustSheet: {
      title: 'Adjust model image',
      placeholder: 'e.g: sleeves rolled up…',
      send: 'Send',
    },
    describeSheet: {
      title: 'Describe changes',
      placeholder: 'e.g: more casual…',
      send: 'Send',
      pieces: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
      show: 'Show the pieces',
      hide: 'Hide the pieces',
      remove: (name: string): string => `Remove ${name} from the prompt`,
    },
    // The piece picker (Felix WardrobePicker): the wardrobe grid as a subview; its search, pills
    // and Photograph one read home's flyout copy.
    picker: {
      title: 'Add pieces',
      swapTitle: (name: string): string => `Swap the ${name}`,
      cta: (n: number): string =>
        n === 0 ? 'Add pieces' : n === 1 ? 'Add 1 piece' : `Add ${n} pieces`,
      swapCta: 'Swap it in',
      empty: 'Nothing here yet.',
      // The WISHLIST tab (PRD §4.6): her wishes join the rack as pieces to find.
      wishEmpty: 'Nothing on your wishlist yet.',
      pickWish: (label: string): string => `Include ${label} from your wishlist`,
      // The ink + at the rail's end: a new piece, filed as she adds it.
      addNew: 'Add a new piece',
    },
    discard: {
      title: 'Discard this draft?',
      body: 'The look won’t be saved or scheduled.',
      discard: 'Discard',
      keep: 'Keep editing',
      // The quiet third way: the draft waits in the Lookbook's In progress row.
      later: 'Keep for later',
    },
    discardEdit: {
      title: 'Discard your changes?',
      body: 'The look stays as it was.',
      discard: 'Discard',
      keep: 'Keep editing',
    },
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
  // Beta's save and update toasts: a suggestion kept as it stands, a look she worked on by name.
  saved: 'Saved to your lookbook',
  savedAs: (name: string): string => `${name} saved to your Lookbook ✓`,
  updated: 'Updated',
  addedToDay: (day: string): string => `In your plan for ${day}.`,
  // Save opens the diary every time (legacy 0.2); closing it is "not yet" and writes nothing.
  // The diary sheet is beta's month (legacy _lkDiaryPaint): any day is one tap, a day gone by
  // records it as worn, and the CTA says which of those it is about to do.
  diary: {
    title: 'Put it in the diary',
    eyebrow: 'Put in the diary',
    pick: 'Pick a day',
    add: (day: string): string => `Add to ${day}`,
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
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
    recordedOn: (day: string): string => `Recorded — worn ${day}`,
    // "I wore this today" says so (beta's __lkDiaryWoreToday).
    wornToday: 'Worn today ✓',
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
    // A filled slot reads warm with its tick; the label says which part of her it dresses.
    filled: { top: '✓ Top', bottom: '✓ Bottom', shoes: '✓ Shoes' },
    // While the next frame comes the last one stays up, under this chip.
    dressing: (pronoun: string): string => `Dressing ${pronoun}…`,
    undressed: (pronoun: string): string => `Couldn’t dress ${pronoun} · Try again`,
    reading: 'Reading the piece…',
    prompt: 'Ask Robes about this look',
  },
  // The draft look and its thread (Front Door design 3b, plan 2026-11-03): one page for every
  // draft, worked on through the prompt on home and here alike; the picture falls behind the rack
  // until she asks for the model again, or saves.
  draft: {
    eyebrow: 'Draft look',
    inLookbook: 'In your Lookbook',
    changed: 'In your Lookbook · changed',
    untagged: 'Untagged — season, agenda, vibe',
    tags: '+ Tags',
    // The pill on the page, and home's box while a draft is live.
    adjust: 'Adjust this look…',
    adjustAfter: 'Anything else, or put something back…',
    notRight: 'What’s not right with it…',
    // The options under the thread.
    redress: 'Dress it again',
    updateModel: (n: number): string => `Update the model · ${n}`,
    adjustOpt: 'Adjust',
    view: 'View draft',
    // Robes' lines.
    first: (line: string): string => `Here’s a first look: ${line}`,
    toFind: (n: number): string =>
      n === 0 ? '' : n === 1 ? 'One piece to find.' : `${TO_FIND_WORDS[n] ?? n} pieces to find.`,
    ask: 'What’s not right with this one? Tell me, and I’ll dress it again.',
    thanks: 'Thanks, that helps. Here it is, dressed again.',
    another: 'Here’s another take, same brief.',
    modelAsked: 'Update the model',
    modelDone: 'Done. The model now wears your changes.',
    savedUpdated: 'Saved, with the model updated.',
    changedBy: (what: string): string => `Updated the rack with your change: ${what}.`,
    // Work lines, and what the picture says while it is drawn.
    dressing: 'Dressing it…',
    dressingAgain: 'Dressing it again…',
    reading: 'Reading your change…',
    usually: 'Usually under a minute',
    rack: 'The rack',
    linesFirst: [
      'Reading your words…',
      'Pulling pieces from your wardrobe…',
      'Finding the pieces to find…',
      'Dressing it on your model…',
    ],
    linesAgain: [
      'Reading your change…',
      'Swapping the pieces…',
      'Keeping the rest as it was…',
      'Dressing it on your model…',
      'Lighting the photo…',
    ],
    // The tile in the day's slot.
    badgeSaved: 'Saved to Lookbook',
    tileBar: 'Draft look',
    tileDressing: 'Dressing…',
    tileRegen: 'Another take, same brief',
    open: 'Open the draft',
    // The bar.
    saving: 'Saving…',
    saved: 'Saved',
    discardChanges: 'Discard changes',
  },
  // The one wardrobe sheet behind every + and every swap (legacy 2026-10-15, design 2 / 4a).
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
    // The tag on a look whose picture stands on a Robes model (plan 2026-11-05 §1.3): a quiet chip
    // on the photograph; on the look page, the deck and a draft it opens the sheet below.
    robesModel: 'Robes model',
    robesModelLabel: 'Robes model — see every look on you',
    // The tag's sheet (design 3b): it opens here, never a navigation, so an undecided deck stays
    // where it was. Capture Selfie is the camera; Adjust Robes Model is her model page.
    twin: {
      eyebrow: 'Robes model',
      title: 'See every look',
      titleEm: 'on you.',
      capture: 'Capture Selfie',
      adjust: 'Adjust Robes Model',
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
