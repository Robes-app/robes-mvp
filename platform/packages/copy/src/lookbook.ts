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
  // The New Look sheet (Front Door PRD rev 3 §5.5): three doors on glass. The first says Create,
  // as Home's day does (Annie, audit notes 15 Nov).
  newLookSheet: {
    describe: 'Create',
    // Capture everywhere a look starts from a photograph (Annie, 15 Nov).
    photo: 'Capture',
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
    // The suggested card's signature under its name, and the pill on its page's photograph
    // (design "Suggested looks · Christmas trial", 23 Nov).
    by: 'Suggested by Robes',
    // Read with the card: a long press offers Save look and Delete look.
    label: (name: string): string => `${name}, suggested by Robes`,
    menu: { save: 'Save look', delete: 'Delete look' },
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
  // A seeded drop's header over Suggested while its looks wait (plan "Seeded Christmas looks"),
  // keyed by the drop's id in app/src/server/seeds.
  seedDrops: {
    'xmas-2026': { title: 'Christmas private trial', line: 'Ten looks for the party season.' },
  } as Record<string, { title: string; line: string } | undefined>,
  // The header's second, quieter sentence under every drop's line.
  seedKeep: 'Keep what feels like you.',
  suggestedEmpty: {
    title: 'You’ve no suggested looks.',
    action: 'Go to Saved',
  },
  // A suggestion saved, from its page or its card's menu: the pieces to find went on her
  // wishlist, and View opens it.
  savedSuggestion: {
    title: 'Saved to your lookbook.',
    body: (n: number): string =>
      n === 1 ? '1 piece added to your wishlist.' : `${n} pieces added to your wishlist.`,
    view: 'View',
  },
  // A suggestion's page (Felix 3e anatomy): its pill, its one button, its delete.
  suggestedLook: {
    save: 'Save look',
    deleteBody: 'It leaves your Lookbook, and its pieces won’t go on your wishlist.',
    // The pencil's hint over a suggestion's rows.
    editHint: 'Heart a piece for your wishlist, or swap it for one you own.',
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
  card: {
    diary: 'Put this look in the diary',
    delete: 'Delete this look',
    // The long-press menu on a Lookbook card (iOS): short, as iOS menus read.
    menu: { schedule: 'Schedule look', delete: 'Delete look' },
    // A look with pieces still to find (Front Door PRD rev 3 §5.2): the small bag on the card.
    shop: 'Includes pieces to find',
  },
  // The saved look as Felix 3e (plan 2026-11-06 D8–D10): the photo with its three discs, Pieces ·
  // Details, and one Schedule look. Web components/looks/saved-look.tsx and look-details.tsx;
  // native features/looks/SavedLook.tsx and LookDetails.tsx.
  savedLook: {
    tabs: { pieces: 'Pieces', details: 'Details' },
    back: 'Back',
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
      // Add a photo to a look (Capture PRD flow 3): the camera that only adds an image. It never
      // reads the pieces. A photo from her library reads Another where a shot reads Retake.
      camera: {
        title: 'Add a photo',
        hint: 'Wearing this look? Step back · Head to toe',
        close: 'Back to the look',
        photos: 'Choose from photos',
        shutter: 'Take photo',
        review: 'Review your photo',
        reviewNote: '',
        back: 'Back to the look',
        retake: 'Retake',
        another: 'Another',
        use: 'Add to look',
        denied: 'Allow the camera in your settings to take a photo here.',
        failed: 'That photo didn’t upload. Try it again.',
      },
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
      done: 'Done',
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
    // A saved look's one accept (3e's pill, the Edit look drawer's footer; D17, D18).
    update: 'Update look',
    doneForDay: 'Save and schedule for this day',
    // The prompt box (look prompt PRD P, D4, L3): the draft's placeholders turn while the field is
    // empty, the board's line first; a saved look's row asks for the change instead.
    placeholder: 'Describe look…',
    placeholders: [
      'relaxed weekend brunch…',
      'dinner date, smart casual…',
      'the office, a long day…',
      'a walk, then lunch…',
      'drinks after work…',
    ],
    savedPlaceholder: 'add matching shoes…',
    // After her first send (docked prompt PRD K5, M4): the field asks for a change, and turns to
    // a styling note and a picture note so she learns the prompt takes both.
    placeholdersAfter: [
      'Or tell Robes what to change…',
      'roll up the sleeves…',
      'a different pose…',
    ],
    // The round send inside the box (P2). Robes styles, it never generates (index.test.ts).
    send: 'Send',
    // Past the limit (P4): said under the field, her words never cut.
    tooLong: (max: number): string => `Keep it under ${max} characters.`,
    // The two sources (S1–S5), each a glyph: what a reader hears for each state, and the short
    // name a pointer shows.
    sources: {
      wardrobe: {
        tip: 'Wardrobe',
        on: 'Wardrobe is on: looks can add pieces you own',
        off: 'Wardrobe is off: no pieces added from your wardrobe',
        empty: 'Nothing in your wardrobe yet',
      },
      shop: {
        tip: 'Shop',
        on: 'Shop is on: looks can add wishlist and new pieces',
        off: 'Shop is off: no wishlist or new pieces added',
      },
    },
    // The feedback thread (look prompt PRD F): Robes asks one question per returned look, two
    // thumbs answer it, and after a thumbs down she taps what to change — up to three reasons, or
    // Restyle it all alone. Each reason carries the example its placeholder shows and the line
    // that stands while Robes changes it.
    feedback: {
      // With no occasion read in her brief (docked prompt PRD Q1).
      question: 'How does it feel?',
      // With the occasion Robes read in her brief (F3); the plain question when it read none.
      questionFor: (occasion: string): string => `How does this feel for ${occasion}?`,
      // After typed words, two or more reasons, or a note about the picture (docked prompt Q4, M5).
      closer: 'Closer?',
      up: 'Love it',
      down: 'Not quite',
      change: 'What should change?',
      // Robes' question after one reason (docked prompt PRD Q2).
      askAfter: {
        dressy: 'Does this feel more relaxed?',
        casual: 'Does this feel less casual?',
        colours: 'Do the colours sit better now?',
        fit: 'Does the shape work better?',
        weather: 'Better for the weather?',
      },
      // After a piece chosen from Which piece? (Q3): `the` as in notThe.
      withoutPiece: (the: string): string => `Better without ${the}?`,
      whichPiece: 'Which piece?',
      // The piece she taps after Which piece? (docked prompt PRD Q6), as its token and her ask:
      // `the` is the piece's name with "the" in front ("the camel shacket").
      notThe: (the: string): string => `Not ${the}`,
      placeholder: 'Or tell Robes what to change…',
      placeholderDown: 'Or tell Robes what you need…',
      reasons: {
        dressy: {
          label: 'Too dressy',
          example: 'swap the heels for trainers…',
          work: 'Changing how dressy it is, keeping the rest…',
        },
        casual: {
          label: 'Too casual',
          example: 'make it a bit more polished…',
          work: 'Changing how casual it is, keeping the rest…',
        },
        colours: {
          label: 'The colours',
          example: 'I hate matching, give the coat some contrast…',
          work: 'Changing the colours, keeping the rest…',
        },
        fit: {
          label: 'Fit or shape',
          example: 'something less boxy on top…',
          work: 'Changing the fit, keeping the rest…',
        },
        piece: {
          label: 'A piece I don’t like',
          example: 'lose the bag…',
          work: 'Changing that piece, keeping the rest…',
        },
        weather: {
          label: 'Not for the weather',
          example: 'it’ll rain, add a proper coat…',
          work: 'Changing it for the weather, keeping the rest…',
        },
      },
      // More than one reason, or her words alone after a thumbs down.
      adjusting: 'Adjusting this look…',
      restyle: {
        label: 'Restyle it all',
        // Robes' question after Restyle it all (Q2).
        ask: 'How does this one feel?',
        example: 'try something with more colour…',
        work: (brief: string): string =>
          brief ? `Starting fresh from “${brief}”…` : 'Starting fresh…',
      },
      remove: (label: string): string => `Remove ${label}`,
    },
    // The prompt's dock at the foot of a look (look prompt PRD F23): open, it heads the thread;
    // minimised, it is one line; closed, the sparkle that opens it again.
    dock: {
      title: 'Styling with Robes',
      open: 'Style with Robes',
      minimise: 'Minimise',
      expand: 'Open the prompt',
      rest: 'Tell Robes what you need',
      // The sparkle's dot, read aloud (docked prompt PRD K3, N5).
      waiting: 'Robes has a question',
    },
    // A tap on Wardrobe while she owns nothing (S3).
    // The alert (docked prompt PRD W2): Add pieces opens the Add Pieces sheet over the draft.
    emptyWardrobe: {
      title: 'Your wardrobe is empty',
      body: 'Add your first pieces to your wardrobe, to use what you already own.',
      add: 'Add pieces',
      notNow: 'Not now',
    },
    // The Rack card before the first piece (PRD §4.6): with a wardrobe it opens the picker; empty
    // it opens Add your pieces. The heading shows once a piece hangs.
    rack: 'The Rack',
    // The pencil on The Rack (PRD §6.1, plan R2): edit-pieces mode shows each row's swap and ×;
    // at rest a row opens its piece.
    editPieces: 'Edit pieces',
    rackCard: {
      pick: 'Pick from your wardrobe',
      // With an empty wardrobe (docked prompt PRD W5).
      add: 'Add pieces to your wardrobe',
    },
    // A look from her photograph (Capture PRD 1c, 10 Nov 2026): Home's Capture opens the camera,
    // Use photo opens the draft with the photograph as its picture, and The Rack offers to find
    // what she is wearing. Every string is the PRD's.
    capture: {
      camera: {
        title: 'Capture a look',
        hint: 'Step back from the mirror · Head to toe',
        close: 'Close',
        photos: 'Choose from your photos',
        shutter: 'Take photo',
        review: 'Review your photo',
        reviewNote: 'Whole outfit in frame?',
        back: 'Back',
        retake: 'Retake',
        use: 'Use photo',
        // The camera refused: her photos still work (PRD 1c.1).
        denied: 'Allow the camera in your settings to take a photo here.',
        saving: 'Opening your look…',
        failed: 'That photo didn’t upload. Try it again.',
      },
      card: {
        eyebrow: 'From your photo',
        title: 'Find the pieces',
        sub: 'Match or add each piece',
        // Once she has skipped, or the look is saved with only its photo (1c.4).
        later: 'Optional · you can do this later',
        skip: 'Skip, keep just the photo',
      },
      finding: 'Finding the pieces…',
      failed: 'Couldn’t find the pieces',
      nothing: 'No pieces found in this photo',
      retry: 'Retry',
      clear: 'The rack is clear. The look keeps its photo.',
      row: {
        match: 'Match to piece',
        add: 'Add piece',
        remove: 'Remove',
        looksLike: 'Looks like your',
        quick: 'Match',
        noMatch: 'No close match in your wardrobe',
      },
      removed: (n: number): string => (n === 1 ? '1 piece removed' : `${n} pieces removed`),
      undo: 'Undo',
      match: {
        title: 'Match to your wardrobe',
        cta: 'Match piece',
        from: (category: string): string => `From the photo · ${category}`,
      },
      // The new-piece review (1c.8): the found piece's details, hers to change before it files.
      review: {
        back: 'Back',
        cta: 'Add to wardrobe',
        adding: 'Adding…',
        failed: 'That piece didn’t file. Try again.',
        // The read is gone (a look saved long ago): the piece is added from the wardrobe instead.
        gone: 'This photo’s read has expired. Add the piece from your wardrobe.',
      },
      discard: {
        title: 'Discard this look?',
        body: 'Pieces you added to your wardrobe stay there.',
      },
    },
    // Describe's day draft: the job behind Style it ended without a look (D22).
    styleFailed: 'Robes couldn’t style that one. Try again in a moment.',
    thread: 'Your words on this look',
    // The context chip: the day's place and weather, read from the diary.
    context: (place: string, range: string): string => `${place} · ${range}`,
    // Delete, in edit mode (D9).
    delete: 'Delete this look',
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
      // The + on WISHLIST while matching a piece from her photograph: it becomes a new wish.
      addWish: 'Save it to your wishlist',
      wishFailed: 'That didn’t save to your wishlist. Try again.',
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
  // Beta's save toast: a look she worked on, by name (a suggestion's is savedSuggestion).
  savedAs: (name: string): string => `${name} saved to your Lookbook ✓`,
  // Update look landed (Capture PRD 3.5).
  updated: 'Look updated',
  // Under it on a saved look (docked prompt PRD V2): each change is written as she makes it.
  updatedBody: 'Your changes replace the saved look.',
  // A draft saved onto a day (docked prompt PRD, Draft saved).
  savedToDay: (day: string): string => `Saved to ${day}`,
  savedToDayBody: 'The look and its pieces are on your week.',
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
    picked: (long: string, today: boolean, suffix: 'worn' | null): string =>
      `${today ? 'Today, ' : ''}${long}${suffix === 'worn' ? ' · records it as worn' : ''}`,
    put: 'Put it in the diary',
    already: 'Already in the diary · Open the day',
    record: 'Record it as worn',
    recorded: 'Already worn that day',
    recordedOn: (day: string): string => `Recorded — worn ${day}`,
    // A wear recorded on today's date says so.
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
    // The pill under a piece the last change swapped (docked prompt PRD T3); the full line is
    // its label. `the` as in feedback.notThe.
    swapped: 'Swapped',
    swappedFor: (the: string): string => `Swapped in for ${the}`,
    // A Shop piece's row, in every context (W6).
    shop: (brand: string): string => `${brand} · Shop`,
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
    // A styling job past its time limit (audit F5): said plainly, with Try again.
    slow: 'This is taking longer than usual.',
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
    doorAfter: 'Anything else, or put something back…',
    doorDraft: 'Change this draft…',
    busyChange: 'Changing the look…',
    busyNote: 'Noting it…',
    doneNone: 'Nothing has changed yet, so there’s nothing to put back.',
    // Robes said it changed the look, but nothing it named could land (a new piece with Shop off,
    // a piece it could not place): its own words would not be true.
    didNotLand: 'I couldn’t make that change. Try it another way?',
    noticed: 'Waiting under Robes noticed — keep it there and it becomes a rule.',
    drafted: 'Robes wrote this from your words. Edit it, or press Enter.',
    send: 'Send',
    fold: 'Close',
    label: (name: string): string => `Change ${name}`,
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
