import { firstRun, home } from './home';
import { legal } from './legal';
import { lookbook } from './lookbook';

// Every user-facing string lives here (SPEC principle 6); voice rules: brand-and-design.md §1.
// Keys are stable ids; values are en-GB. Use curly apostrophes (’) and no exclamation marks.

const COUNT_WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
] as const;

// Sentence-leading counts read as words up to fifteen ("Seven pieces filed."), digits after.
export function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

export const errors = {
  unauthenticated: 'Please sign in again.',
  forbidden: 'That isn’t available on your account.',
  not_found: 'Robes couldn’t find that.',
  invalid_input: 'Something in that request wasn’t quite right.',
  conflict: 'That changed while you were working. Refresh and try again.',
  payload_too_large: 'That was too large to send.',
  rate_limited: 'You’re going quickly. Give it a moment.',
  quota_exceeded: 'You’ve reached today’s limit for this.',
  capacity: 'Robes is busy right now. Try again shortly.',
  disabled: 'This is paused for a moment.',
  upgrade_required: 'Update Robes to keep going.',
  internal: 'Robes couldn’t finish that. Please try again in a moment.',
} as const;

export const auth = {
  title: 'Sign in.',
  subtitle: 'Your wardrobe, styled.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  sendCode: 'Email me a code',
  sendingCode: 'Sending…',
  codeTitle: 'Check your email.',
  codeSubtitle: (email: string): string => `Robes sent a six-digit code to ${email}.`,
  codeLabel: 'Code',
  verify: 'Continue',
  verifying: 'Checking…',
  resend: 'Send a new code',
  useDifferentEmail: 'Use a different email',
  or: 'or',
  apple: 'Continue with Apple',
  google: 'Continue with Google',
  invalidEmail: 'That email doesn’t look quite right.',
  invalidCode: 'That code didn’t match. Check it and try again.',
  sendFailed: 'Robes couldn’t send a code just now. Try again in a moment.',
  signOut: 'Sign out',
  legal: { lead: 'By continuing you agree to the', and: 'and', end: '.' },
} as const;

export const emails = {
  otpSubject: (code: string): string => `${code} is your Robes code`,
  otpBody: (code: string, purpose: 'sign-in' | 'verify'): string =>
    `Your code to ${purpose === 'sign-in' ? 'sign in to Robes' : 'confirm your email'} is ${code}.\n\nIt expires in 10 minutes. If you didn’t ask for it, you can ignore this email.`,
} as const;

export const onboarding = {
  eyebrow: 'Welcome',
  title: 'What should Robes call you?',
  firstNameLabel: 'First name',
  continue: 'Continue',
  saving: 'Saving…',
  failed: 'Robes couldn’t save that. Try again in a moment.',
  pieceEyebrow: 'Your first piece',
  pieceTitle: 'Tell Robes about a piece you love.',
  pieceLabel: 'Describe it',
  piecePlaceholder: 'A camel wool coat',
  pieceStart: 'Style it',
  skip: 'Skip for now',
} as const;

export const today = {
  greeting: (firstName: string | null, hour: number): string => {
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return firstName ? `${part}, ${firstName}.` : `${part}.`;
  },
  nextStep: 'Add a piece and Robes will dress it three ways.',
  // The one next step (legacy _rbNextLine): a sentence and a quiet door.
  next: {
    start: { text: 'Add a piece and Robes will dress it three ways.', door: 'Add pieces' },
    five: {
      text: (n: number): string =>
        `${n === 1 ? 'One more piece' : `${n} more pieces`} and Robes builds a look from yours alone.`,
      door: 'Add pieces',
    },
    build: {
      text: (n: number): string => `${countWord(n)} pieces filed. Build a look from what you own.`,
      door: 'Build a look',
    },
    wear: {
      text: 'Today is dressed. Open the look when you’ve worn it.',
      door: 'Open today’s look',
    },
    week: { text: 'Nothing planned this week. Pin a look to a day.', door: 'Open the plan' },
    none: 'What are we dressing for today?',
    model: {
      text: (look: string, presence: 'woman' | 'man' | 'unspecified'): string =>
        `Build your model and ${presence === 'man' ? 'he’ll' : presence === 'unspecified' ? 'they’ll' : 'she’ll'} wear ${look}.`,
      door: 'Build your model',
    },
  },
  todayLooks: 'Today',
  worn: 'Worn',
  week: 'This week',
  weekDay: (label: string, looks: number): string =>
    looks === 0 ? `${label}, free` : `${label}, ${looks === 1 ? 'one look' : `${looks} looks`}`,
  tray: {
    title: 'In the studio',
    running: 'Styling…',
    ready: 'Ready',
    failed: 'Didn’t finish',
    stylePiece: 'Style a piece',
    styleColour: 'Reading your colours',
    trip: 'Packing a trip',
  },
  ideas: 'Recent ideas',
  seeAll: 'See all',
  // Style it for today (legacy Dress today).
  daily: {
    action: 'Style it for today',
    eyebrow: 'Today',
    title: 'What’s today?',
    promptLabel: 'What’s on (optional)',
    promptPlaceholder: 'Client lunch, then drinks',
    start: 'Style it',
    starting: 'Starting…',
    trayTitle: 'Style it for today',
    steps: {
      'The Anchor': 'The anchor',
      'The Canvas': 'The canvas',
      'The Texture': 'The texture',
      'The Accents': 'The accents',
    },
    yours: 'Yours',
    alternates: 'Or',
    transition: 'Later on',
    imageAlt: (headline: string): string => `Today’s look: ${headline}`,
    save: 'Save this look',
    saving: 'Saving…',
    nameLabel: 'Name it',
    saved: 'Look saved.',
    failed: 'Robes couldn’t style today. Try again in a moment.',
    // Items beyond the anchor render when she asks (UX-09).
    showItem: 'Show it',
    showItemLabel: (name: string): string => `Show ${name}`,
    itemAlt: (name: string): string => `Robes’ picture of ${name}`,
  },
  inbox: (n: number): string =>
    n === 1 ? 'One piece is waiting in your Inbox.' : `${n} pieces are waiting in your Inbox.`,
  // The look Robes made overnight for her date (M5 task 3).
  overnight: {
    title: 'Your look for today',
    open: 'Open it',
  },
} as const;

// Next step → sentence and door, shared by web and native (each maps `target` to its own route).
export type NextDoorTarget = 'addPieces' | 'newLook' | 'todayLook' | 'plan' | 'model';
export function nextLine(
  step: {
    rule: 'start' | 'model' | 'five' | 'build' | 'wear' | 'week';
    remaining?: number;
    count?: number;
    lookName?: string;
    presence?: 'woman' | 'man' | 'unspecified';
  } | null,
): { text: string; door: { label: string; target: NextDoorTarget } | null } {
  const n = today.next;
  if (!step) return { text: n.none, door: null };
  switch (step.rule) {
    case 'start':
      return { text: n.start.text, door: { label: n.start.door, target: 'addPieces' } };
    case 'model':
      return {
        text: n.model.text(step.lookName ?? 'your look', step.presence ?? 'woman'),
        door: { label: n.model.door, target: 'model' },
      };
    case 'five':
      return {
        text: n.five.text(step.remaining ?? 1),
        door: { label: n.five.door, target: 'addPieces' },
      };
    case 'build':
      return {
        text: n.build.text(step.count ?? 5),
        door: { label: n.build.door, target: 'newLook' },
      };
    case 'wear':
      return { text: n.wear.text, door: { label: n.wear.door, target: 'todayLook' } };
    case 'week':
      return { text: n.week.text, door: { label: n.week.door, target: 'plan' } };
  }
}

export const marketing = {
  eyebrow: 'Robes',
  titleLead: 'Your wardrobe,',
  titleEm: 'styled.',
  subtitle: 'One piece. Three ways to wear it.',
  signIn: 'Sign in',
  metaTitle: 'Robes — Your Personal Stylist & Wardrobe Intelligence App',
  metaDescription:
    'Robes is your personal stylist. Edit what you own, rotate underused pieces, and discover key wardrobe pieces to complete a look.',
  ogTitle: 'Robes — Your Personal Stylist & Wardrobe App',
  ogDescription:
    'A web-first wardrobe intelligence platform. Style the wardrobe you already own and curate personalized looks from a single prompt.',
  waitlist: {
    title: 'Join the waitlist.',
    body: 'Robes is opening slowly. Leave your email and we’ll let you in.',
    emailLabel: 'Email',
    nameLabel: 'First name (optional)',
    submit: 'Join',
    submitting: 'Joining…',
    // The same answer whether or not the address was already listed (no enumeration).
    done: 'Check your email to confirm your place.',
    failed: 'Robes couldn’t add you just now. Try again in a moment.',
    emailMissing: 'Please enter your email to join',
    emailInvalid: 'Please enter a valid email address',
    hint: 'Join today and style a key piece three ways — a small taste of Robes while you wait.',
    confirmEyebrow: 'Waitlist',
    confirmTitle: 'Confirm your place?',
    confirm: 'Confirm',
    confirmed: 'You’re on the list. We’ll email you when it’s your turn.',
    invalid: 'This link doesn’t work any more. Join again from the home page.',
    email: {
      subject: 'Confirm your place on the Robes waitlist',
      body: 'Tap below to confirm it’s you. If you didn’t ask to join, ignore this email.',
      cta: 'Confirm my place',
      notice: 'You’re getting this because this address was entered on byrobes.com.',
    },
  },
} as const;

export const nav = {
  today: 'Home',
  wardrobe: 'Wardrobe',
  looks: 'Lookbook',
  plan: 'Diary',
  create: 'Create',
  you: 'You',
} as const;

export const jobs = {
  status: {
    queued: 'Waiting to start…',
    running: 'Working on it…',
    succeeded: 'Done.',
    partial: 'Mostly done. Some images didn’t make it.',
    failed: 'Robes couldn’t finish that. Please try again.',
    cancelled: 'Cancelled.',
  },
  cancel: 'Cancel',
  connectionLost: 'Reconnecting…',
  imagesLabel: 'Images',
  imagePending: 'Image on its way',
  fake: {
    title: 'A test look, three ways.',
    lines: [
      'Start with the piece you reach for most.',
      'Add one thing that changes its mood.',
      'Finish with shoes you can walk in.',
    ],
  },
  dev: {
    eyebrow: 'Platform',
    title: 'Job smoke test.',
    start: 'Start a fake job',
    starting: 'Starting…',
    startFailed: 'Robes couldn’t start that. Try again in a moment.',
  },
} as const;

// Dev-only tooling page (/dev/upload); never shipped to deployed environments.
export const devUpload = {
  title: 'Upload a photo.',
  fileLabel: 'Photo',
  uploading: 'Uploading…',
  processing: 'Processing. Refresh to check.',
  refresh: 'Refresh',
  ready: 'Ready.',
  failed: 'Robes couldn’t use that photo.',
  uploadFailed: 'Robes couldn’t upload that. Try again in a moment.',
  imageAlt: 'Your uploaded photo',
} as const;

export const wardrobe = {
  title: 'Wardrobe',
  newPiece: 'New piece',
  reading: 'Robes is reading this piece…',
  noPieceFound: 'Robes couldn’t see a piece in this photo.',
  // Beta's premise: the look is built from her photographs.
  empty: {
    title: 'Every look starts with a photograph.',
    body: 'Catalogue your wardrobe, or photograph what you’re wearing now.',
    action: 'Catalogue your wardrobe',
  },
  deleted: 'Piece removed.',
  undo: 'Undo',
  // The header's segment reads Wardrobe (beta); the list it opens is still "Pieces".
  segments: { pieces: 'Pieces', wardrobe: 'Wardrobe', wishlist: 'Wishlist', inbox: 'Inbox' },
  removePiece: (label: string): string => `Remove ${label}`,
  photoAlt: (label: string): string => `Photo of ${label}`,
  wishlistEmpty: {
    title: 'Pieces you’re after live here.',
    body: 'Keep a list of what you want, then tell Robes when you buy it.',
  },
  // The Inbox holds forwarded receipts only; a pasted link goes straight to Review.
  inboxEmpty: {
    title: 'Forwarded receipts land here.',
    body: 'Forward an order email to your Robes address and its pieces wait here for a yes or no.',
  },
  piece: {
    back: 'Wardrobe',
    label: 'Name',
    brand: 'Brand',
    color: 'Colour',
    size: 'Size',
    notes: 'Notes',
    save: 'Save changes',
    saving: 'Saving…',
    saved: 'Saved.',
    remove: 'Remove from wardrobe',
    stylePiece: 'Style this piece',
    // The record door leads with the photograph (legacy bc56305): the name carries a pencil
    // and the brand is its own tappable line, empty or not.
    editName: 'Edit the name',
    addBrand: 'Add the brand',
    // The record's sections (legacy Piece_Sheet 01): every fact is a row, a tap opens its drawer.
    sections: {
      piece: 'The piece',
      // Colour and material share one section (design "Colour & material, one section").
      colour: 'Colour & material',
      wearing: 'Wearing',
      fit: 'Fit & notes',
      wears: 'Wears',
      looks: (n: number): string => (n === 1 ? 'In one look' : `In ${n} looks`),
      noLooks: 'Not in a look yet',
      noLooksHint: 'Build a look and it files here.',
    },
    // The Category drill (wardrobe_taxonomy). The sheet calls its third level "item type"; she
    // reads "type", because nothing in Robes is an item.
    taxonomy: {
      justThis: (l2: string): string => `Just ${l2.toLowerCase()}`,
    },
    rows: {
      category: 'Category',
      colour: 'Colour',
      extra: 'Additional colours',
      print: 'Print',
      material: 'Material',
      season: 'Season',
      wearFor: 'Wear it for',
      size: 'Size',
      price: 'Price',
      notes: 'Notes',
    },
    // What a row says when there is nothing filed yet — a door, not a blank.
    add: 'Add',
    // Robes' read on this row is a guess she should look at (until she touches it).
    check: 'Check',
    saveField: 'Save',
    done: 'Done',
    // The stats strip under the name.
    stats: { worn: 'Worn', lastWorn: 'Last worn', inLooks: 'In looks', never: 'Not yet' },
    wears: {
      none: 'Not yet. The counter starts the first day you wear it.',
      openDay: (date: string): string => `Open ${date}`,
      undated: (n: number): string =>
        n === 1
          ? 'One wear counted before Robes kept the dates.'
          : `${n} wears counted before Robes kept the dates.`,
    },
    extraHint: 'Buttons, trims, a second colour in the weave. Tap as many as there are.',
  },
  // The colour model on a piece (legacy f3e5b5b): one shade, up to three more, a print.
  colour: {
    title: 'Colour',
    notSet: 'Not set',
    change: 'Change colour',
    done: 'Done',
    main: 'Main colour',
    extra: 'Additional colours',
    extraHint: 'Up to three.',
    families: 'Colour families',
    print: 'Print',
    plain: 'Plain',
    check: 'Robes wasn’t sure of this colour. Check it.',
  },
  // The material model on a piece (legacy 2026-10-24): one material, the one it is mostly made of.
  // The family and material names live with the list in @robes/core/material.
  material: {
    title: 'Material',
    families: 'Material families',
    notSure: 'Not sure',
    check: 'Robes wasn’t sure of this material. Check it.',
  },
  // The piece record's rows and their one-field drawers (redline audit "Add a piece", 26 Oct).
  fields: {
    // What an empty row offers, in the faint ink, instead of a column of "Add".
    hints: { brand: 'e.g. Toteme', category: 'Choose', optional: 'Optional' },
    // A filled Notes row: the note prints beneath, the row is the door to change it.
    edit: 'Edit',
    name: { placeholder: 'What is it?' },
    brand: { placeholder: 'Who made it' },
    notes: { placeholder: 'How it fits, how you wear it' },
    // The category drill's back chevron.
    back: (to: string): string => `Back to ${to}`,
    price: {
      helper: 'Both optional. Robes fills them in when a receipt or a link carries them.',
      currencies: 'Currency',
      chip: (symbol: string, code: string): string => `${symbol} ${code}`,
    },
    size: {
      down: 'A size smaller',
      up: 'A size larger',
      conversion: (eu: number, us: number): string => `EU ${eu} · US ${us}`,
      notSure: 'Not sure',
    },
    wearFor: {
      helper: 'Pick as many as fit.',
      own: '+ Your own',
      ownLabel: 'Your own',
    },
  },
  // The reveal after one photo (beta's step 3): her photo, then what Robes filed.

  wishlist: {
    bought: 'I bought this',
    boughtToast: (label: string): string => `${label} is in your wardrobe now.`,
    removed: 'Removed from your wishlist.',
    remove: (label: string): string => `Remove ${label}`,
  },
  // The one header (legacy a268ef0/809b13e): track + circle, category tabs, the 32pt count row.
  header: {
    addPiece: 'Add a piece',
    savePiece: 'Save a piece',
    categories: 'Categories',
    all: 'All',
    count: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
    wishCount: (n: number): string => `${n} wishlisted`,
    filter: 'Filter',
    layout: 'Layout',
    grid: 'Grid',
    list: 'List',
  },
  // The piece card (legacy b4b051a): eyebrow, serif name, status line, the star or Bought.
  card: {
    worn: (n: number): string => `Worn ${n}×`,
    neverWorn: 'Never worn',
    notYours: (price: string | null): string =>
      price ? `${price} · Not yours yet` : 'Not yours yet',
    star: (label: string): string => `Feature ${label} in your Hero Rack`,
    unstar: (label: string): string => `Remove ${label} from your Hero Rack`,
    starred: 'Saved to your Hero Rack.',
    unstarred: 'Removed from your Hero Rack.',
    heroFull: 'The Hero Rack holds ten. Remove one first.',
    bought: 'Bought',
    boughtLabel: (label: string): string => `I bought ${label}`,
    swipeRemove: 'Remove',
    addRow: 'Add a piece',
    addHint: 'Photograph · Receipt · Link',
    noPhoto: 'Photograph it',
  },
  filter: {
    title: 'Filter',
    season: 'Season',
    colour: 'Colour',
    seasons: {
      spring_summer: 'Spring/Summer',
      autumn_winter: 'Autumn/Winter',
      year_round: 'Year-round',
    },
    wearFor: 'Wear it for',
    brand: 'Brand',
    allBrands: 'All brands',
    show: (n: number): string => (n === 1 ? 'Show 1 piece' : `Show ${n} pieces`),
    clear: 'Clear all',
    nothing: 'Nothing in your wardrobe here.',
    wishNothing: 'Nothing on your wishlist here.',
    showEverything: 'Show everything',
  },
  edit: 'Edit',
  addFailed: 'Robes couldn’t add those photos. Try again in a moment.',
  photosDenied: 'Allow Robes to see your photos in Settings to add pieces.',
  cameraDenied: 'Allow Robes to use the camera in Settings to photograph pieces.',
  category: 'Category',
  // Wardrobe › Inbox: one forwarded receipt at a time, every piece ticked until she unticks what
  // went back (Add Piece redline 05c). The notice is the card on Wardrobe while one waits (05b).
  inbox: {
    from: (retailer: string): string => `From ${retailer}`,
    today: 'Today',
    yesterday: 'Yesterday',
    read: (n: number): string => `${n} ${n === 1 ? 'piece' : 'pieces'} read`,
    untick: 'Untick anything that went back.',
    file: (n: number): string =>
      n === 0 ? 'File pieces' : `File ${n} ${n === 1 ? 'piece' : 'pieces'}`,
    toWishlist: 'Add to wishlist',
    skip: 'Skip',
    more: (n: number): string =>
      n === 1 ? 'One more receipt after this.' : `${countWord(n)} more receipts after this.`,
    notice: (receipts: number): string =>
      receipts === 1
        ? 'Robes read one receipt'
        : `Robes read ${countWord(receipts).toLowerCase()} receipts`,
    filed: 'Filed.',
    skipped: 'Skipped.',
  },

  // Add a piece, end to end (design "Add Piece — Handoff", 2026-10-26): one sheet, every way in,
  // one Review before anything files. Where the pieces go is chosen once and carried through.
  add: {
    title: 'Add pieces',
    close: 'Close',
    destination: 'Where they go',
    to: { wardrobe: 'Wardrobe', wishlist: 'Wishlist' },
    doors: {
      photograph: 'Take a photo',
      cameraRoll: 'Camera roll',
      link: 'Paste a link',
      receipt: 'Forward a receipt',
      manual: 'Add without a photo',
    },
    // What the camera says once it has a shot.
    shots: {
      reading: 'Reading…',
      found: (n: number): string =>
        n === 0
          ? 'Nothing found yet'
          : n === 1
            ? 'One piece found'
            : `${countWord(n)} pieces found`,
      // "Review 3": how many photos are waiting; hidden until there is one.
      review: (n: number): string => `Review ${n}`,
      roll: 'Open the camera roll',
    },
    link: {
      eyebrow: 'Paste a link',
      title: 'Add from a',
      wink: 'shop page.',
      label: 'Link to the piece',
      placeholder: 'https://',
      paste: 'Paste',
      clear: 'Clear the link',
      // Where the piece goes, chosen once on the Add pieces sheet; Change goes back to it.
      filingTo: {
        wardrobe: 'Filing to your wardrobe',
        wishlist: 'Filing to your wishlist',
      },
      change: 'Change',
      read: 'Read the page',
      reading: 'Reading the page…',
      failed: 'Robes couldn’t read that page.',
      fixIt: 'Fix it',
    },
    manual: {
      eyebrow: 'Without a photo',
      title: 'Add a',
      wink: 'piece.',
      addPhoto: 'Add a photo later',
      changePhoto: 'Change the photo',
      uploading: 'Adding the photo…',
      failed: 'Robes couldn’t add that piece. Try again in a moment.',
    },
    review: {
      eyebrow: 'Review',
      title: 'Here’s what Robes',
      wink: 'saw.',
      sub: {
        photo: 'Read from your photo. Tap anything that isn’t quite right.',
        link: 'Read from the shop page. Tap anything that isn’t quite right.',
      },
      reading: 'Reading…',
      // "Robes is *reading* your photo…": the middle word in serif italic.
      readingHead: {
        pre: 'Robes is',
        wink: 'reading',
        post: (n: number): string => (n > 1 ? 'your photos…' : 'your photo…'),
      },
      readingPhoto: (n: number): string =>
        n > 1 ? 'Robes is reading your photos…' : 'Robes is reading your photo…',
      unread: 'Robes couldn’t read this one.',
      fillIn: 'Fill it in yourself',
      cancel: 'Cancel',
      retake: 'Retake',
      notThis: 'Not this piece',
      pieces: 'Pieces to review',
      piece: (n: number, of: number): string => `Piece ${n} of ${of}`,
      nothing: 'Robes couldn’t see a piece in those photos.',
      stalled: 'One photo didn’t upload. Take it again.',
      failed: 'Robes couldn’t file that. Try again in a moment.',
      file: (to: 'wardrobe' | 'wishlist', next: boolean): string =>
        `${to === 'wishlist' ? 'Add to wishlist' : 'Add to wardrobe'}${next ? ', next piece →' : ' →'}`,
    },
    filed: {
      head: (n: number): string => `${countWord(n)} ${n === 1 ? 'piece' : 'pieces'}`,
      wink: 'filed.',
      line: {
        wardrobe: 'In your wardrobe, ready to style.',
        wishlist: (n: number): string =>
          n === 1 ? 'It’s on your wishlist.' : 'They’re on your wishlist.',
      },
      none: 'Nothing filed this time.',
      see: { wardrobe: 'See your wardrobe', wishlist: 'See your wishlist' },
      another: 'Add another',
    },
    file: (to: 'wardrobe' | 'wishlist'): string =>
      to === 'wishlist' ? 'Add to wishlist →' : 'Add to wardrobe →',
  },
  // The camera in the app (design "Add Piece — Handoff"): every shot is read as it is taken, and
  // Review opens on them, filing where the Add pieces sheet chose.
  camera: {
    title: 'Camera',
    close: 'Close the camera',
    shutter: 'Take the photo',
    taken: (n: number): string => (n === 1 ? '1 photo taken' : `${n} photos taken`),
    unreachable: 'Robes can’t reach the camera.',
    // The viewfinder before the camera answers, and the door when she refused it.
    waiting: 'The camera is opening.',
    allow: 'Allow the camera',
    useDevice: 'Use the phone’s camera',
    leave: (n: number): string => (n === 1 ? 'Leave this photo?' : `Leave these ${n} photos?`),
    leaveBody: 'Nothing is filed until you review them.',
    leaveConfirm: 'Leave them',
    stay: 'Keep shooting',
  },
} as const;

// SEC-84: two equal choices, asked once analytics is unanswered; changeable in You › Privacy.
export const consent = {
  bannerTitle: 'Help shape Robes.',
  bannerBody:
    'May Robes count which screens you open and what you tap? It never sees your photos, words or email.',
  allow: 'Allow',
  decline: 'Don’t allow',
  failed: 'Robes couldn’t save that. Try again in a moment.',
  privacyEyebrow: 'You',
  privacyTitle: 'Privacy.',
  analyticsLabel: 'Usage counts',
  analyticsHint: 'Which screens you open and what you tap, so Robes can get better.',
  replayLabel: 'Screen recordings',
  replayHint:
    'Recordings of how you move through Robes, with every word, photo and typed answer hidden. Needs usage counts.',
  saving: 'Saving…',
  saved: 'Saved.',
  back: 'Back to Today',
} as const;

// Shared component chrome (@robes/ui, @robes/ui-native).
export const ui = {
  wordmark: 'Robes',
  loading: 'One moment…',
  close: 'Close',
  dismiss: 'Dismiss',
  undo: 'Undo',
  notifications: 'Notifications',
  // Radix fills {hotkey} in the viewport label only; the provider label is announced verbatim.
  notificationsRegion: 'Notifications ({hotkey})',
  imagesReady: (done: number, total: number): string => `${done} of ${total} images ready`,
  progress: {
    reading: 'Reading your pieces…',
    styling: 'Styling your pieces…',
    dressing: 'Dressing each look…',
    finishing: 'Finishing touches…',
  },
  back: 'Back',
  retry: 'Try again',
} as const;

// App shell (IA §3.2): nav, Create sheet, command bar, placeholder routes.
export const shell = {
  primaryNav: 'Main',
  openYou: 'You',
  create: {
    title: 'Create',
    groups: { add: 'Add pieces', dress: 'Dress' },
    photograph: 'Photograph pieces',
    cameraRoll: 'From camera roll',
    newLook: 'New look',
    askRobes: 'Ask Robes',
    stylePiece: 'Style a piece',
    planTrip: 'Plan a trip',
  },
  command: {
    label: 'Search Robes',
    placeholder: 'Go to, or ask Robes…',
    empty: 'No matches.',
    groupGo: 'Go to',
    groupCreate: 'Create',
    hint: '⌘K',
  },
  soon: {
    title: 'On its way.',
    body: 'This part of Robes is being built. Everything you add now will be here when it lands.',
    back: 'Back to Today',
  },
  segments: {
    saved: 'Saved',
    ideas: 'Ideas',
  },
} as const;

// Looks › Ideas and the Style a piece flow.
export const looks = {
  title: 'Lookbook',
  stylePiece: {
    eyebrow: 'Style a piece',
    title: 'Which piece?',
    fromWardrobe: 'From your wardrobe',
    describe: 'Or describe it',
    describePlaceholder: 'A white linen shirt',
    occasionLabel: 'Where to? (optional)',
    occasionPlaceholder: 'Dinner, the office, a wedding',
    start: 'Style it',
    starting: 'Starting…',
  },
  result: {
    eyebrow: 'Three ways',
    frameAlt: (title: string): string => `A look: ${title}`,
    save: 'Save',
    saved: 'Saved',
    remove: 'Remove',
    removed: 'Idea removed.',
    fallback: 'Robes couldn’t see that piece clearly, so here’s a close match.',
    outfit: 'The look',
    details: 'Details',
    accessories: 'Finish with',
    // Only the first look is pictured up front; the others when she asks (UX-09).
    showLook: 'Show this look',
    showLookLabel: (title: string): string => `Show this look: ${title}`,
    renderFailed: 'Robes couldn’t picture that one. Try again.',
  },
  ideas: {
    empty: {
      title: 'Your ideas land here.',
      body: 'Style a piece and Robes will dress it three ways.',
      action: 'Style a piece',
    },
    expires: (days: number): string => `Keeps for ${days} more ${days === 1 ? 'day' : 'days'}`,
  },
  saved: {
    empty: {
      title: 'Looks you keep live here.',
      body: 'Save an idea to keep it.',
    },
  },
  // Robes' suggested name for an unnamed look; provisional until she names it.
  suggestedName: (firstPiece: string | null): string =>
    firstPiece ? `${firstPiece}, styled` : 'A new look',
  savedList: {
    empty: {
      title: 'Looks you keep live here.',
      body: 'Save one of Robes’ ideas, or build a look from your pieces.',
      action: 'New look',
    },
    worn: (times: number): string => (times === 1 ? 'Worn once' : `Worn ${times} times`),
  },
  saveWay: 'Save this look',
  savedWay: 'Look saved.',
  openLook: 'Open',
  page: {
    eyebrow: 'Look',
    suggested: 'Robes’ suggestion',
    keepName: 'Keep this name',
    rename: 'Rename',
    nameLabel: 'Name',
    saveName: 'Save name',
    cancel: 'Cancel',
    note: 'Notes',
    pieces: 'Pieces',
    wearToday: 'Wear it today',
    woreToday: 'Worn today.',
    dayLabel: 'Day',
    addedToPlan: 'Added to your diary.',
    saveAsNew: 'Save as new',
    savedAsNew: 'Saved as a new look.',
    remove: 'Remove',
    removed: 'Look removed.',
    imageAlt: (name: string): string => `The look: ${name}`,
    noPieces: 'No pieces yet.',
    // On the photograph: the day it is worn, and her own picture of it.
    addPhoto: 'Add your photograph',
    photoNote: 'Wore this look? Add your photograph and it is kept alongside Robes’ own.',
    // The look's own record: a wear is a fact, so it keeps its date and what was on the body.
    wears: {
      title: 'Worn',
      none: 'Not yet. The counter starts the first day you wear it.',
      count: (n: number): string =>
        n === 1 ? 'once' : n === 2 ? 'twice' : n === 3 ? 'three times' : `${n} times`,
      // A day she wore it exactly as the look stands needs no difference named.
      asSaved: 'Worn as saved',
      openDay: (date: string): string => `Open ${date}`,
      remove: (date: string): string => `Not worn on ${date}`,
      removed: 'Taken off the record.',
      addDate: 'Add a date',
      added: 'Recorded.',
      // What that day held that the look no longer does, and what it holds that she did not wear.
      // The names are printed as she filed them — never re-cased, or a brand reads wrong.
      diff: (instead: string[], without: string[]): string => {
        const list = (xs: string[]) =>
          xs.length > 2
            ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
            : xs.join(' and ');
        if (instead.length && without.length)
          return `${list(instead)} in place of ${list(without)}`;
        if (instead.length) return `With ${list(instead)}`;
        if (without.length) return `Without ${list(without)}`;
        return 'Worn a little differently';
      },
    },
  },
  composer: {
    eyebrow: 'New look',
    title: 'Pick the pieces.',
    nameLabel: 'Name (optional)',
    namePlaceholder: 'Gallery opening',
    selected: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
    create: 'Save look',
    creating: 'Saving…',
    togglePiece: (label: string): string => `Include ${label}`,
    empty: 'Add a few pieces to your wardrobe first.',
    // Native: the picker heading under the screen title.
    pick: 'Choose the pieces',
  },
  look: {
    worn: (times: number): string =>
      times === 0 ? 'Not worn yet' : `Worn ${times} ${times === 1 ? 'time' : 'times'}`,
    wearToday: 'Wear it today',
    woreToday: 'Worn today.',
    removed: 'Look removed.',
    pieces: 'Pieces',
    imageAlt: (name: string): string => `The look: ${name}`,
    suggested: 'Robes’ suggested name',
    keepName: 'Keep this name',
    nameLabel: 'Name this look',
    saveName: 'Save name',
    wearOnDay: 'Wear on a day',
    saveAsNew: 'Save as new',
    savedAsNew: 'Saved as a new look.',
  },
} as const;

// You area.
export const you = {
  title: 'You',
  // The header row's title on the root (legacy settings.html): the avatar's door reads Settings.
  settings: 'Settings',
  version: 'Robes beta',
  // The Account tab's groups and the line under each row (beta's Settings › Account).
  sections: { profile: 'Profile', notifications: 'Notifications', privacy: 'Privacy & terms' },
  subs: {
    account: 'Name, email and home city',
    notifications: 'Your looks when they’re ready, and the odd note from Robes',
    receipts: 'Forward an order email and Robes files the pieces',
    privacy: 'What Robes keeps, and why',
    terms: 'Plain English',
  },
  help: 'Need a hand?',
  helpEmail: 'hello@byrobes.com',
  account: {
    title: 'Account',
    name: 'Name',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    emailHint: 'Your email signs you in, so it can’t be changed here.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
    homeCity: 'Home city',
    homeCityHint: 'Robes checks its weather when it styles your day.',
  },
  notifications: {
    title: 'Notifications',
    looksReady: 'When your looks are ready',
    morningCue: 'A morning cue with today’s look',
    nudges: 'Gentle nudges to add pieces',
    receipts: 'When a receipt becomes a piece',
  },
  privacy: 'Privacy',
  legal: {
    terms: 'Terms',
    privacyNotice: 'Privacy notice',
  },
  signOut: 'Sign out',
  deletion: {
    title: 'Delete account',
    body: 'Robes will delete your pieces, looks, photos and account. This can’t be undone.',
    confirmLabel: 'Type DELETE to confirm',
    confirm: 'Delete my account',
    requested: 'Your account is being deleted. You’ll be signed out when it’s done.',
  },
  style: {
    title: 'Your colours and shape',
    link: 'Colours and shape',
    colourTitle: 'Your colours',
    colourBody: 'A clear photo of your face in daylight, no filter.',
    silhouetteTitle: 'Your shape',
    silhouetteBody: 'A full-length photo, standing straight, in fitted clothes.',
    choosePhoto: 'Choose a photo',
    reading: 'Robes is reading your photo…',
    retake: 'Use another photo',
    noFace: 'Robes couldn’t see a face clearly. Try another photo.',
    noPerson: 'Robes couldn’t see your full figure. Try another photo.',
    failed: 'Robes couldn’t read that photo. Try another.',
    best: 'Wear',
    avoid: 'Go easy on',
    metals: 'Metals',
    neutrals: 'Neutrals',
    traits: 'Your lines',
    necklines: 'Necklines',
    silhouettes: 'Shapes that work',
    tips: 'Tips',
    // Your colours and Your prints (legacy a61f211): three states per family, shade and print.
    palette: {
      coloursTitle: 'Your colours',
      coloursBody:
        'Love weighs a colour up. Avoid means nothing new in it; what you own is still styled.',
      // The sheet's own sub and closing note (legacy settings.html shColours/shPrints): her
      // answers outrank the photographs, and avoid is soft — it never un-styles what she owns.
      coloursSub:
        'The colours you love, and the ones you’d rather not buy. Yours to change at any time — they outrank what Robes reads from your photographs.',
      coloursNote:
        'Robes won’t suggest new pieces in anything you avoid. What you already own in one is styled like any other.',
      printsTitle: 'Your prints',
      printsSub: 'The prints you love, and the ones you’d rather not buy.',
      printsNote: 'Robes won’t suggest new pieces in a print you avoid.',
      states: { avoid: 'Avoid', none: 'No view', love: 'Love' },
      shades: (family: string): string => `${family} shades`,
      // The family row's quiet meta: only the shades she has set apart from it.
      shadesSet: (n: number): string => `${n} ${n === 1 ? 'shade' : 'shades'} set`,
      showShades: 'Shades',
      hideShades: 'Hide shades',
      setHere: 'Set here',
      fromFamily: 'From the family',
      matchFamily: 'Match the family',
      saved: 'Saved.',
      // The row's value (legacy dnaPaint): "Blues, cherry · avoids reds", or Not yet.
      summary: (love: readonly string[], avoid: readonly string[], n = 3): string => {
        const few = (a: readonly string[], k: number) =>
          a.slice(0, k).join(', ') + (a.length > k ? ` +${a.length - k}` : '');
        return love.length + avoid.length === 0
          ? 'Not yet'
          : [
              love.length ? few(love, n) : '',
              avoid.length
                ? `avoids ${few(
                    avoid.map((w) => w.toLowerCase()),
                    2,
                  )}`
                : '',
            ]
              .filter(Boolean)
              .join(' · ');
      },
    },
    // Native's close-up card (Colouring).
    colour: {
      reading: 'Reading your colouring…',
      noSubject: 'Robes couldn’t see a face in that photo. Try another.',
    },
  },
  // SEC-81: her data as one file.
  dataExport: {
    title: 'Download your data',
    body: 'Everything you’ve given Robes, in one file. It takes a few minutes and the link lasts seven days.',
    request: 'Prepare my data',
    requesting: 'Asking…',
    preparing: 'Preparing your file…',
    ready: 'Your file is ready.',
    download: 'Download',
    failed: 'Robes couldn’t prepare your file. It will try again shortly.',
    expired: 'That link has expired.',
    again: 'Prepare a new file',
  },
  // Forwarded receipts: her private Robes address (M3 task 10).
  receipts: {
    title: 'Forward receipts',
    body: 'Forward an order email here and Robes holds the pieces in your Inbox for a yes or no.',
    // The door's own anatomy (legacy _showMailStep): the eyebrow, the heading, and the address
    // card as THE one action — tap it to copy. No "Open Mail": a blank mail read wrong.
    eyebrow: 'Forward a receipt',
    heading: 'Your own address.',
    addressLabel: 'Your Robes address',
    settingUp: 'Setting up your address…',
    steps: [
      'Forward the order email.',
      'Robes reads each piece’s colour, cut, label, price and sizing.',
      'You review and verify before anything gets filed.',
    ],
    waiting: (n: number): string => `${n} ${n === 1 ? 'piece' : 'pieces'} waiting`,
    review: (n: number): string => (n === 1 ? 'Review it →' : 'Review them →'),
    copy: 'Copy address',
    // The pill's own label for two seconds after a tap.
    copied: 'Copied',
    copyFailed: (address: string): string => `Copy this address: ${address}`,
    regenerate: 'New address',
    regenerated: 'New address ready. The old one no longer works.',
    turnOff: 'Turn off',
    turnedOff: 'Forwarding is off.',
    turnOn: 'Get an address',
    // Native: the share sheet carries Copy.
    share: 'Share address',
  },
  // You › Your model (legacy stylenotes): never "avatar", always "your model".
  model: {
    link: 'Your model',
    title: 'Your model.',
    subtitle: 'Build her once and she’ll wear every look you keep.',
    empty: 'Your model starts the moment your first photograph reads — or shape her by hand.',
    source: {
      read: 'Read from your photographs',
      mixed: 'Part read, part chosen',
      hand: 'Chosen by hand',
    },
    photos: 'Read from a photo',
    presence: 'Presence',
    presenceOptions: { woman: 'Woman', man: 'Man', unspecified: 'Prefer not to say' },
    skin: 'Skin',
    skinNames: ['Espresso', 'Mahogany', 'Chestnut', 'Tan', 'Honey', 'Sand', 'Peach', 'Porcelain'],
    hair: 'Hair',
    hairNames: ['Jet black', 'Espresso', 'Chestnut', 'Caramel', 'Ash blonde'],
    line: 'The line',
    lineOptions: { soft: 'Softer', none: 'As she is', straight: 'Straighter' },
    frame: 'The frame',
    frameOptions: { fuller: 'Fuller', none: 'As she is', narrower: 'Narrower' },
    build: 'Build your model',
    creating: 'Creating your model…',
    failed: 'Robes couldn’t draw your model just now. Change a pick to try again.',
    imageAlt: 'Your model',
    seeOnMe: 'See it on me',
    dressing: 'Dressing your model…',
    onMeFailed: 'Robes couldn’t dress your model just now. Try again in a moment.',
  },
} as const;

// Diary (M5): the rolling list of days.
export const plan = {
  title: 'Diary',
  today: 'Today',
  tomorrow: 'Tomorrow',
  emptyDay: 'Free',
  free: 'A free day',
  evening: 'Evening',
  activityLabel: (date: string): string => `What’s on, ${date}`,
  // Native: the field label when the day is already shown above it.
  activityField: 'What’s on',
  activityPlaceholder: 'Dinner, the office',
  saveActivity: 'Save',
  unpin: (name: string): string => `Take ${name} off this day`,
  unpinned: 'Taken off the day.',
  empty: {
    title: 'Nothing planned',
    titleEm: 'yet.',
    body: 'Open a look and choose Wear on a day.',
    action: 'Go to Lookbook',
  },
  monthCaption: 'Month reads the shape of it. List is where you plan.',
  // A past day on the web's month card: what it held, never a fraction.
  monthFiled: (pieces: number): string =>
    `Filed · ${pieces === 1 ? '1 piece' : `${pieces} pieces`}`,
  monthMore: (n: number): string => `+${n}`,
  // Month view (M5 task 4) and trip days.
  view: { label: 'Diary view', list: 'List', month: 'Month' },
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  moreLooks: (n: number): string => `+${n} more`,
  tripBadge: 'Trip',
  trips: 'Trips this month',
  tripLine: (range: string, days: number): string =>
    `${range} · ${days === 1 ? '1 day' : `${days} days`}`,
  // The one header and the summary list (legacy ff87e89 + 809b13e).
  header: {
    add: 'Add a look',
    window: (days: number): string => `The next ${days} days`,
  },
  list: {
    thisWeek: 'This week',
    restOfWeek: 'Rest of this week',
    nameTheDay: 'Name the day',
    looks: (n: number): string => (n === 1 ? '1 look' : `${n} looks`),
    pieces: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
    open: (day: string): string => `Open ${day}`,
  },
  // The day page: the one door every day opens (legacy ff87e89).
  day: {
    back: (label: string): string => label,
    rename: 'Rename the day',
    name: 'Name the day',
    nameLabel: 'The day’s name',
    planned: 'Looks planned',
    filed: 'Looks filed',
    filedToday: 'Looks filed today',
    stat: (looks: number, pieces: number): string =>
      `${looks === 1 ? '1 look' : `${looks} looks`}${pieces ? ` · ${pieces === 1 ? '1 piece' : `${pieces} pieces`} filed` : ''}`,
    lookEyebrow: (n: number): string => `Look ${n}`,
    remove: (name: string): string => `Take ${name} off the day`,
    addAnother: 'Add a look',
    addAnotherHint: 'another moment in the day',
    choose: 'Choose from your looks',
    chooseHint: 'pick one or several',
    dress: 'Dress this day…',
    weatherLabel: 'The day’s weather',
    // What the forecast means for the case, in Robes' voice (legacy layer hint).
    advice: (condition: string, tempRange: string): string => {
      const high = Number(String(tempRange).match(/(-?\d+)°/)?.[1]);
      if (/rain|drizzle|thunder/.test(condition)) return 'Bring a shell for the rain.';
      if (/snow/.test(condition)) return 'Boots, and a warm coat.';
      if (high <= 10) return 'A proper coat today.';
      if (high <= 16) return 'Bring one warm layer.';
      if (high >= 25) return 'Light and breathable.';
      return 'Easy layers.';
    },
  },
  // The Add-a-look picker: saved looks, one or several at once.
  picker: {
    eyebrow: (day: string): string => `Add a look · ${day}`,
    title: 'What to wear?',
    yourLooks: 'Your looks',
    hint: 'Tap looks to add one or several',
    add: (n: number): string => (n === 1 ? 'Add 1 look' : `Add ${n} looks`),
    already: 'Already on this day',
    neverWorn: 'Look · never worn',
    lastWorn: (date: string): string => `Look · last ${date}`,
    // The looks still waiting in Suggested, one tap away (a day takes saved looks only).
    suggested: (n: number): string =>
      `${countWord(n)} ${n === 1 ? 'look waits' : 'looks wait'} in Suggested — save one first`,
    lastWornFirst: 'Last worn ↓',
    firstWornFirst: 'First worn ↑',
    sortLabel: 'Order',
    refine: 'Refine',
    refineOn: (n: number): string => `Refine · ${n}`,
    search: 'Search by name or piece',
    clear: 'Clear all',
    noneTitle: 'Nothing matches.',
    noneBody: 'Clear the filters to see every saved look.',
    added: (n: number, day: string): string =>
      n === 1 ? `Added to ${day}.` : `${n} looks added to ${day}.`,
    emptyTitle: 'Nothing saved',
    emptyTitleEm: 'yet.',
    emptyBody: 'Save a look you like and it can go on this day.',
    toLooks: 'Go to Lookbook',
  },
  week: {
    title: 'The week ahead',
    plan: 'Diary',
    day: (label: string, looks: number): string =>
      looks === 0 ? `${label}, free` : `${label}, ${looks === 1 ? 'one look' : `${looks} looks`}`,
  },
} as const;

// Public share page and the share action.
export const share = {
  eyebrow: 'A look from Robes',
  by: (name: string): string => `Styled by ${name}`,
  pieces: 'The pieces',
  ways: 'Ways to wear it',
  cta: 'Style your own wardrobe',
  imageAlt: (name: string): string => `The look: ${name}`,
  pieceAlt: (label: string): string => label,
  gone: 'This link has been turned off.',
  metaDescription: 'A look styled with Robes.',
  action: 'Share',
  copied: 'Link copied.',
  copyFailed: (url: string): string => `Copy this link: ${url}`,
  stop: 'Stop sharing',
  stopped: 'Link turned off.',
} as const;

// Notification emails (legacy notify.js sequence) and the unsubscribe page.
export const notify = {
  unsubLabel: 'Stop these emails',
  privacyLabel: 'Privacy',
  notice: 'You’re getting this because you asked Robes to keep in touch.',
  looksReady: {
    subject: 'Your three looks are ready.',
    body: (piece: string): string =>
      `${piece}, worn three ways. Pick one and Robes builds it around what’s yours.`,
    cta: 'See the looks',
  },
  five: {
    subject: 'Robes can build from yours now.',
    body: 'Five pieces filed. Open the composer and build a look from what you own.',
    cta: 'Build a look',
  },
  // plan_a_day (7-day brief, day 5): week_empty retuned.
  weekEmpty: {
    subject: 'Nothing planned this week.',
    body: 'Name a day and Robes dresses it — tomorrow, Thursday, the dinner you’ve been thinking about. The plan keeps the week.',
    cta: 'Open the plan',
    footer:
      'Want a line each morning on the days you’ve planned? Turn it on in You › Notifications.',
  },
  // The first seven days (legacy docs/beta-onboarding-7day-brief.md).
  firstPiece: {
    subject: 'One piece is enough.',
    body: 'Your wardrobe starts with one piece you love — a photograph, or a link from a shop. Robes reads it and shows you three ways to wear it.',
    cta: 'Add your first piece',
  },
  pickOne: {
    subject: 'Which one would you wear?',
    body: (piece: string): string =>
      `${piece}, worn three ways — they’re waiting in your Lookbook. Pick one and Robes builds it around what’s yours.`,
    cta: 'See the three',
  },
  weekOne: {
    subject: 'Your week, on paper.',
    pieces: (n: number): string => `${countWord(n)} ${n === 1 ? 'piece' : 'pieces'} filed.`,
    looks: (n: number): string => `${countWord(n)} ${n === 1 ? 'look' : 'looks'} kept.`,
    model: 'Your model on file.',
    dressed: (weekday: string): string => `${weekday} dressed.`,
    next: {
      model: {
        line: 'Build your model and she wears every look you keep.',
        cta: 'Build your model',
      },
      five: {
        line: (n: number): string =>
          `${countWord(n)} more ${n === 1 ? 'piece' : 'pieces'} and Robes builds from yours alone.`,
        cta: 'Add pieces',
      },
      plan: { line: 'Name a day and Robes dresses it.', cta: 'Open the plan' },
      wear: { line: 'Today is dressed. Tap the day when you’ve worn it.', cta: 'Open today' },
      done: {
        line: 'Nothing left to set up — the plan keeps the week from here.',
        cta: 'Open Robes',
      },
    },
  },
  // Every Robes mail closes on this when replies reach a person (7-day brief delta 1).
  replyLine: 'Reply to this email — it reaches Annie, who reads every one.',
  // Push-only moments (7-day brief, phase 2): short enough for a lock screen.
  push: {
    modelNudge: {
      title: 'She’d wear it.',
      body: (look: string): string => `Build your model and she wears ${look}.`,
    },
    batchNudge: {
      title: (n: number): string => `${countWord(n)} more ${n === 1 ? 'piece' : 'pieces'}.`,
      body: 'Then Robes builds a look from yours alone.',
    },
    woreIt: {
      title: 'Wore it?',
      body: (weekday: string): string => `Tap ${weekday} and Robes remembers.`,
    },
  },
  morning: {
    subject: (weekday: string, title: string): string => `${weekday} · ${title}`,
    body: (look: string): string => `Wearing ${look}.`,
    cta: 'Open the day',
    footer: 'Wore it? The look page takes it.',
    untitled: 'Your day',
    // The cue for a look Robes made overnight (no day planned).
    overnightBody: 'Robes dressed you for today. Open it to see the look.',
  },
  unsubscribe: {
    eyebrow: 'Emails',
    title: 'Stop these emails?',
    body: {
      looksReady: 'You won’t get an email when your looks are ready.',
      morningCue: 'You won’t get the morning email with the day’s look.',
      nudges: 'You won’t get the occasional nudge to add pieces or plan.',
      receipts: 'You won’t get an email when a receipt becomes pieces.',
    },
    confirm: 'Stop them',
    done: 'Done. You can turn them back on in You › Notifications.',
    invalid: 'This link doesn’t work any more. Change emails in You › Notifications.',
  },
  // Forwarded receipts (legacy sendReceiptMail): transactional, stood down by the receipts pref.
  receipt: {
    subject: (shop: string): string => `Robes read your ${shop} receipt.`,
    heading: (shop: string): string => `Your ${shop} receipt is read.`,
    body: (count: number): string =>
      `Robes read ${count === 1 ? 'one piece' : `${count} pieces`} out of it. Untick anything that went back and the rest file straight to your wardrobe.`,
    cta: (count: number): string => (count === 1 ? 'Review it' : 'Review them'),
    notice: 'You’re getting this because you forwarded a receipt to your Robes address.',
  },
  lookWaiting: {
    subject: 'She’d wear it.',
    body: (look: string): string =>
      `${look} is saved. Build your model once and she wears every look you keep.`,
    cta: 'Build your model',
  },
} as const;

// Admin area (staff only; every read is audited).
export const admin = {
  eyebrow: 'Admin',
  nav: {
    label: 'Admin',
    overview: 'Overview',
    users: 'Users',
    costs: 'Costs',
    metrics: 'Metrics',
    flags: 'Flags',
    feedback: 'Feedback',
    audit: 'Audit log',
  },
  overview: {
    title: 'Job health, last 24 hours.',
    counts: 'Jobs by kind and status',
    durations: 'Duration',
    errors: 'Commonest errors',
    none: 'No jobs in the last 24 hours.',
  },
  users: {
    title: 'Users',
    search: 'Email starts with',
    searchAction: 'Search',
    empty: 'No users match.',
    next: 'Next page',
    columns: {
      email: 'Email',
      name: 'Name',
      joined: 'Joined',
      pieces: 'Pieces',
      looks: 'Looks',
      jobs: 'Jobs',
      lastActive: 'Last active',
    },
  },
  user: {
    back: 'All users',
    profile: 'Profile',
    consents: 'Consents',
    usage: 'Usage today',
    jobs: 'Recent jobs',
    deletion: 'Deletion',
    noDeletion: 'No deletion request.',
    role: 'Staff role',
    none: 'None',
    auditTrail: 'Audit trail for this user',
    records: {
      pieces: (shown: number, total: number): string =>
        shown < total ? `Wardrobe · newest ${shown} of ${total}` : `Wardrobe · ${total}`,
      wishlist: 'Wishlist',
      looks: 'Looks',
      artifacts: 'Saved artifacts',
      feedback: 'Feedback',
      memory: 'What she told Robes',
      brief: 'Her style brief',
      notifications: 'Emails sent',
      inbox: 'Receipts',
      calls: 'Model calls',
      events: 'Events',
      none: 'None recorded.',
      noPhoto: 'No photo',
      hero: 'Hero',
      bought: 'Bought',
      saved: 'Saved',
      unsaved: 'Not saved',
      open: 'Open',
      prompt: 'Prompt',
      cleared: 'Cleared',
      worn: (n: number, last: string | null): string =>
        n === 0 ? 'Not worn' : `Worn ${n}×${last ? ` · ${last}` : ''}`,
      ratings: { up: 'Up', down: 'Down', none: 'No rating' },
      columns: {
        photo: 'Photo',
        name: 'Name',
        category: 'Category',
        brand: 'Brand',
        colour: 'Colour',
        material: 'Material',
        status: 'Status',
        via: 'Arrived by',
        wears: 'Wears',
        source: 'Source',
        price: 'Price',
        pieces: 'Pieces',
        toFind: 'To find',
        type: 'Type',
        title: 'Title',
        rating: 'Rating',
        note: 'Note',
        about: 'About',
        kind: 'Kind',
        surface: 'Surface',
        text: 'What',
        list: 'List',
        because: 'Because',
        channel: 'Channel',
        retailer: 'Retailer',
        items: 'Pieces read',
        filed: 'Filed',
        feature: 'Feature',
        model: 'Model',
        latency: 'Latency',
        cost: 'Cost',
        when: 'When',
        event: 'Event',
      },
    },
    fields: {
      email: 'Email',
      firstName: 'First name',
      lastName: 'Last name',
      timezone: 'Timezone',
      locale: 'Locale',
      joined: 'Joined',
      onboarded: 'Onboarded',
    },
    jobColumns: {
      kind: 'Kind',
      status: 'Status',
      error: 'Error',
      started: 'Created',
      duration: 'Duration',
    },
  },
  costs: {
    title: 'Costs, last 30 days.',
    daily: 'Spend by day, feature and model',
    spenders: 'Top spenders',
    budget: 'Today’s budget',
    exhausted: 'Stopped',
    open: 'Open',
    columns: {
      day: 'Day',
      feature: 'Feature',
      model: 'Model',
      calls: 'Calls',
      cost: 'Cost',
      user: 'User',
      family: 'Model family',
      limit: 'Limit',
      state: 'State',
    },
    none: 'No calls in this period.',
  },
  metrics: {
    title: (days: number): string => `Metrics, last ${days} days.`,
    range: 'Window',
    rangeOption: (days: number): string => `${days} days`,
    note: 'Counts only, UTC days. Active means she filed, styled, wore, told Robes something or opened the app that day.',
    daily: 'Sign-ups and active people by day',
    funnel: 'Activation, of those who signed up in the window',
    pieces: 'Pieces filed, by how they arrived',
    looks: 'Looks saved, by source',
    deck: 'Keep or pass deck',
    jobs: 'Jobs by kind',
    queue: 'Queue right now',
    email: 'Email',
    none: 'Nothing in this window.',
    columns: {
      day: 'Day',
      signups: 'Sign-ups',
      active: 'Active',
      step: 'Step',
      people: 'People',
      share: 'Of sign-ups',
      source: 'Source',
      count: 'Count',
      kind: 'Kind',
      total: 'Total',
      succeeded: 'Succeeded',
      failed: 'Failed',
      failRate: 'Failure rate',
      p50: 'p50',
      p95: 'p95',
      spend: 'Model spend',
      measure: 'Measure',
      value: 'Value',
    },
    steps: {
      signedUp: 'Signed up',
      firstPiece: 'Filed a first piece',
      firstSavedLook: 'Saved a first look',
      returned: 'Came back within 7 days',
    },
    deckRows: {
      kept: 'Kept',
      edited: 'Edited into a draft',
      passed: 'Passed',
      waiting: 'Not decided yet',
      keepRate: 'Keep rate (of decided)',
    },
    queueRows: {
      queued: 'Queued',
      running: 'Running',
      oldest: 'Oldest queued',
      stale: 'Queued over 5 minutes',
      expired: 'Running past their lease (stuck)',
    },
    emailRows: {
      sent: 'Sent',
      failed: 'Failed',
      suppressed: 'Suppressed',
      bounces: 'New bounces',
      complaints: 'New complaints',
      unsubscribes: 'New unsubscribes',
    },
  },
  flags: {
    title: 'Flags',
    hint: 'Turning a flag off pauses that feature for everyone within 30 seconds.',
    failed: 'That flag didn’t change. Try again.',
    changed: (key: string, on: boolean): string => `${key} is now ${on ? 'on' : 'off'}.`,
  },
  feedback: {
    title: 'Feedback',
    empty: 'No feedback yet.',
    next: 'Older feedback',
    columns: {
      when: 'When',
      user: 'Who',
      rating: 'Rating',
      note: 'Note',
      about: 'About',
    },
  },
  call: {
    eyebrow: 'Model call',
    back: 'Back to the user',
    prompt: 'Prompt',
    response: 'Response',
    detail: 'Detail',
    cleared: 'Cleared after 30 days.',
    fields: {
      user: 'User',
      feature: 'Feature',
      model: 'Model',
      status: 'Status',
      latency: 'Latency',
      cost: 'Cost',
      tokens: 'Tokens in / out',
      images: 'Images',
      job: 'Job',
      when: 'When',
    },
  },
  artifact: {
    eyebrow: 'Saved artifact',
    back: 'Back to the user',
    data: 'As stored',
    fields: {
      user: 'User',
      type: 'Type',
      subtitle: 'Subtitle',
      created: 'Created',
      saved: 'Saved',
      deleted: 'Deleted',
      job: 'Job',
      version: 'Schema version',
    },
  },
  audit: {
    title: 'Audit log',
    empty: 'Nothing recorded yet.',
    next: 'Older entries',
    columns: {
      when: 'When',
      actor: 'Who',
      action: 'Action',
      subject: 'Subject',
      ip: 'IP',
    },
  },
  empty: '—',
} as const;

// Trips (M5 task 6): plan a trip, its capsule and its looks.
export const trips = {
  create: {
    eyebrow: 'Plan a trip',
    title: 'Where to?',
    destinationLabel: 'Destination',
    destinationPlaceholder: 'Lisbon',
    fromLabel: 'From',
    toLabel: 'To',
    occasionsLabel: 'Your plans (one per line, optional)',
    occasionsPlaceholder: 'Beach day\nDinner out',
    briefLabel: 'Anything else? (optional)',
    briefPlaceholder: 'Walking a lot, one smart dinner',
    keyPiecesLabel: 'Pieces to pack (optional)',
    submit: 'Plan it',
    submitting: 'Planning…',
    tooLong: 'Trips run up to ten days.',
    endsBefore: 'The trip ends before it starts.',
  },
  progress: {
    title: 'Packing your trip…',
    failed: 'Robes couldn’t pack that trip. Try again in a moment.',
  },
  page: {
    eyebrow: 'Trip',
    forecast: 'Forecast',
    seasonal: 'Usual for these dates',
    capsule: 'The capsule',
    looks: 'The looks',
    suitcase: 'In the case',
    yours: 'Yours',
    pin: 'Add the looks to your plan',
    pinning: 'Adding…',
    pinned: 'On your plan.',
    remove: 'Remove trip',
    removed: 'Trip removed.',
  },
} as const;

// You › Style Profile: the digital twin, Style DNA and Robes observations (legacy Settings,
// 2026-10-07/08). Robes reads, she confirms; never "AI", "profile", "questionnaire" or "body type".
const linesCount = (n: number): string => (n === 0 ? 'Not yet' : n === 1 ? '1 line' : `${n} lines`);
const joinAnd = (a: readonly string[]): string =>
  a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
export const twin = {
  tabs: { label: 'You', style: 'Style profile', account: 'Account' },
  cards: {
    twin: 'Your digital twin',
    dna: 'Style DNA',
    observations: 'Observations',
  },
  noticed: {
    eyebrow: 'Observations',
    keep: 'That’s right',
    notMe: 'Not quite',
    kept: 'Kept. Filed under Style DNA.',
  },
  twinPage: {
    title: 'Your digital twin',
    readFrom: 'Read from your photograph and facts',
    colouring: 'Colouring',
    colouringSub: 'One close-up reads your season.',
    bodyShape: 'Body shape',
    bodyShapeSub: 'Set your line by hand.',
    // The caption under her model: colour words only, never a shape.
    // Only what she chose or a close-up read: an unchosen skin or hair has no name to show.
    caption: (skin: string, hair: string): string =>
      [skin, hair ? `${String(hair).toLowerCase()} hair` : ''].filter(Boolean).join(' · '),
    drawing: 'Drawing your model…',
    twinFailed:
      'Robes couldn’t photograph your model just now. A close-up in daylight, facing the camera, helps.',
    closeUpCard: 'Your close-up',
    closeUpHelp: 'Robes reads your season, skin and hair from this.',
    season: 'Your season',
    addSeason: 'Add a close-up and Robes reads your season.',
    colourNotes: 'Full colour notes',
    anotherSeason: 'Another season',
    seasonFailed: 'Robes couldn’t change the reading just now.',
    // "{axes} — {one sentence}." — one dash, never two.
    seasonSummary: (axes: string, summary: string): string => {
      let sum = String(summary)
        .trim()
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/[.\s]+$/, '');
      if (sum) sum += '.';
      return axes && sum ? `${axes} — ${sum}` : axes || sum;
    },
    skinAndHair: 'Skin and hair',
    skinAndHairRead: 'Read from your close-up. Nudge either if it looks off.',
    skinAndHairHand: 'Or choose them by hand until a close-up reads.',
    yourLine: 'Your line',
    edit: 'Edit',
    proportions: (presence: 'woman' | 'man' | 'unspecified'): string =>
      `${presence === 'man' ? 'His' : presence === 'unspecified' ? 'Their' : 'Her'} proportions`,
    adjust: 'Adjust by hand',
    scales: {
      shoulders: { label: 'Shoulders', less: 'Narrower', more: 'Broader' },
      bust: { label: 'Bust', less: 'Smaller', more: 'Fuller' },
      hips: { label: 'Hips', less: 'Narrower', more: 'Fuller' },
    },
    chest: 'Chest',
    asIs: (presence: 'woman' | 'man' | 'unspecified'): string =>
      `As ${presence === 'man' ? 'he' : presence === 'unspecified' ? 'they' : 'she'} is`,
    // A cell's spoken name: "Hips: much fuller".
    stop: (label: string, stop: number, less: string, more: string, asIs: string): string =>
      `${label}: ${stop === 0 ? asIs : `${Math.abs(stop) === 2 ? 'much ' : ''}${String(stop < 0 ? less : more).toLowerCase()}`}`,
    backToFacts: 'Back to your facts',
    gender: 'Gender',
    age: 'Age',
    // The one italic line under her model (legacy #mv-status): what Robes drew her from, and what
    // would take her further. "Nothing yet" is retired from the chrome, so the last rung says drawn.
    status: (
      presence: 'woman' | 'man' | 'unspecified',
      read: 'both' | 'closeUp' | 'facts' | 'hand' | 'none',
    ): string => {
      const man = presence === 'man';
      const they = presence === 'unspecified' ? 'they' : man ? 'he' : 'she';
      const theyAre = presence === 'unspecified' ? 'They’re' : man ? 'He’s' : 'She’s';
      const their = presence === 'unspecified' ? 'their' : man ? 'his' : 'her';
      const s = presence === 'unspecified' ? '' : 's';
      if (read === 'both')
        return `Read from your close-up and your facts. ${theyAre} as close as ${they} get${s}.`;
      if (read === 'closeUp')
        return `Read from your close-up. Add your facts and Robes draws ${their} line.`;
      if (read === 'facts')
        return `Drawn from your facts. Add a close-up and ${they} take${s} your face.`;
      if (read === 'hand')
        return `Shaped by hand. A close-up or your facts, whenever you like — ${they} update${s}.`;
      return 'Nothing drawn yet. Add a close-up, or set your line from your facts.';
    },
    // The stage with nothing on it (legacy #mv-fig-empty), over the ghost figure.
    stageEmpty: 'Your model starts here.',
  },
  facts: {
    title: 'The facts',
    height: 'Height',
    size: 'Size',
    shoes: 'Shoes',
    age: 'Age',
    gender: 'Gender',
    add: 'Add',
    less: 'Less',
    more: 'More',
    cm: 'cm',
    ftIn: 'ft / in',
    clear: 'Clear the facts',
    genderOptions: { woman: 'Woman', man: 'Man', unspecified: 'Prefer not to say' },
    unspecified: '—',
    bust: 'Bust',
    waist: 'Waist',
    braSize: 'Bra size',
    tape: 'Tape',
    band: 'Band',
    cup: 'Cup',
    inches: 'in',
    bustValue: (band: number | null, cup: string | null, cm: number | null): string =>
      band && cup ? `${band}${cup}` : cm ? `${cm} cm` : '',
    waistValue: (cm: number, unit: 'cm' | 'in'): string =>
      unit === 'cm' ? `${cm} cm` : `${Math.round(cm / 2.54)} in`,
    heightValue: (cm: number): string => `${cm} cm`,
    ukValue: (uk: number | string): string => `UK ${uk}`,
    euValue: (eu: number | string): string => `EU ${eu}`,
  },
  dnaPage: {
    title: 'Style DNA',
    sub: 'What you love, and the lines you dress by.',
    taste: 'Your taste',
    words: 'In your words',
    styleType: 'Style type',
    brands: 'Brands',
    icons: 'Icons',
    pieces: 'Pieces you love',
    investment: 'Investment level',
    loves: 'What works on you',
    avoids: 'Hard nos',
    rules: 'Your rules',
    notYet: 'Not yet',
    pickOne: 'Pick one',
    noneStarred: 'None starred',
    sometimes: (types: string): string => `sometimes ${types}`,
    brandsCount: (n: number): string => `${n} brands`,
    iconsCount: (n: number): string => `${n} icons`,
    piecesCount: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
    linesCount,
  },
  types: {
    title: 'Style type',
    sub: 'Pick as many as feel like you.',
    desc: {
      Minimal: 'Clean lines, few decisions, nothing loud.',
      Bohemian: 'Loose shapes, print and texture worn together.',
      Classic: 'Tailoring, good shoes, nothing that dates.',
      Romantic: 'Soft volume, lace, colour that flatters.',
      Sculptural: 'Architectural cuts. The volume is the point.',
      Utility: 'Workwear roots, pockets, honest hardware.',
      Heritage: 'Collars, knits, a little of the old school.',
      Eclectic: 'Nothing matches. It works anyway.',
      'Off-duty': 'Technical fabric, worn like it is not.',
      'Avant-garde': 'Asymmetry, black, the unfamiliar shape.',
    } as Record<string, string>,
  },
  wall: {
    brandsTitle: 'Brands',
    brandsSub: 'Select 3+ brands you like. This informs your Style DNA.',
    iconsTitle: 'Icons',
    iconsSub: 'Whose style runs close to yours? Robes reads the register, not the wardrobe.',
    searchBrands: 'Search brands',
    searchIcons: 'Search or type a name',
    clear: 'Clear',
    selections: 'Your selections',
    keptCount: (n: number): string => `${n} kept`,
    matches: 'Matches',
    popular: 'Popular among stylists',
    often: 'Often chosen',
    tapToKeep: 'Tap a name to keep it',
    noMatch: 'Nothing in the pool by that name.',
    allYours: 'Everything here is yours already.',
    add: (name: string): string => `+ Add “${name}”`,
    remove: (name: string): string => `Remove ${name}`,
  },
  pieces: {
    title: 'The pieces you love',
    sub: 'Robes reads what they share. It never dresses you in the same one two days running.',
    empty: 'Nothing starred yet. The star on a piece in your wardrobe marks it as one you love.',
    starMore: 'Star more from your wardrobe',
  },
  investment: {
    title: 'Investment level',
    sub: 'How much you spend a year. Robes proposes inside it, whatever you admire.',
    notes: {
      under_500: 'Occasional picks',
      '500_1500': 'Regular wardrobe updates',
      '1500_5000': 'Considered investment',
      '5000_plus': 'Fashion is a priority',
    } as Record<string, string>,
  },
  words: {
    loves: {
      title: 'What works on you',
      sub: 'Lines Robes dresses toward, every time.',
      another: 'Another that works',
      empty: 'Nothing kept so far. Keep a line Robes noticed, or write your own.',
    },
    avoids: {
      title: 'Hard nos',
      sub: 'Robes never proposes these, whatever the occasion.',
      another: 'Another no',
      empty: 'No hard nos so far. Tap a chip, or write whatever Robes should never do.',
      yours: 'Your nos',
    },
    rules: {
      title: 'Your rules',
      sub: 'The lines you dress by.',
      another: 'Another rule',
      empty: 'No rules so far. The lines you dress by, in your words.',
      yours: 'Your rules',
    },
    always: 'Always',
    alwaysHint: 'Robes keeps these on every look',
    never: 'Never',
    neverHint: 'whatever the occasion',
    own: 'Your own',
    first: 'A line of your own',
    strike: (text: string): string => `Strike “${text}”`,
    suggests: 'Robes suggests',
    suggestsHint: 'From what you’ve never kept',
    keep: 'Keep',
    filed: '✓ Filed · Robes reads it from here on',
    from: (text: string): string => `from “${text}”`,
    // 409 brief_list_full: the server keeps at most BRIEF_KEPT_MAX lines per list.
    full: 'This list is full. Strike a line to make room for a new one.',
  },
  observations: {
    title: 'Observations',
    sub: 'What Robes notices. Say it’s right and it joins your Style DNA.',
    since: 'Since your last visit',
    reading: 'Robes is reading your wardrobe…',
    failed: 'Robes couldn’t read your wardrobe just now — try again in a moment.',
    // "Nothing yet" is banned in chrome (brand §1), so the legacy line opens "Nothing so far".
    empty: 'Nothing so far. Robes notes what you keep and change on your looks.',
    keptBefore: 'Kept before',
    keep: 'That’s right',
    notMe: 'Not quite',
    answer: (verb: string, text: string): string => `${verb}: ${text}`,
    remove: (text: string): string => `Remove from your Style DNA: ${text}`,
    removed: 'Removed from your Style DNA.',
    list: {
      loves: 'Works',
      avoids: 'Never',
      rules: 'Rule',
      notes: 'How you dress well',
      colours: 'Colour',
    } as Record<string, string>,
    keptIn: (month: string): string => `Kept in ${month}`,
    // Written by the read onto each line it drafts (stored with the line).
    evidence: (pieces: number, looks: number): string =>
      pieces && looks
        ? `From ${pieces} pieces and ${looks} ${looks === 1 ? 'look' : 'looks'}`
        : pieces
          ? `From ${pieces} ${pieces === 1 ? 'piece' : 'pieces'} filed`
          : looks
            ? `From ${looks} ${looks === 1 ? 'look' : 'looks'}`
            : 'From your style type and icons',
    colourLine: (lovedIn: readonly string[], rejectedIn: readonly string[]): string => {
      const loved = Array.isArray(lovedIn) ? lovedIn : [];
      const rejected = Array.isArray(rejectedIn) ? rejectedIn : [];
      const rej = joinAnd(rejected);
      return [
        loved.length ? `You reach for ${joinAnd(loved)}.` : '',
        rejected.length
          ? `${rej.charAt(0).toUpperCase()}${rej.slice(1)} ${rejected.length > 1 ? 'stay' : 'stays'} on the rail.`
          : '',
      ]
        .filter(Boolean)
        .join(' ');
    },
  },
} as const;

export { firstRun, home } from './home';
export { legal } from './legal';
export { lookbook } from './lookbook';

// Several pieces from one photograph (legacy 2026-10-13): a look from a photo (use case 2b); the
// wardrobe add (use case 3) is now Add pieces' Review (wardrobe.add).
const piecesWord = (n: number): string => (n === 1 ? 'piece' : 'pieces');

export const photoPieces = {
  failed: 'Robes couldn’t read the pieces in that photo. Try again in a moment.',
  // A photo that never finished preparing is not a photo with nothing in it: saying "no
  // piece" for a stalled upload sends everyone looking at the wrong thing (23 Oct).
  stalled: 'Robes couldn’t open that photo. Try it again in a moment.',
  photoAlt: 'Your photo',
  tag: (n: number, label: string): string => `Piece ${n}: ${label}`,
  cards: 'Pieces in your photo',
  chip: { new: 'New', check: 'Check' },
  status: {
    toAdd: 'To add',
    skipped: 'Skipped',
    owned: 'Already yours',
    ownedPhoto: 'Already yours · photo added',
    looksLikeYours: 'Looks like yours',
    ownPhoto: ' · its own photo',
  },
  picker: {
    title: 'Which piece is it?',
    sub: 'From your wardrobe',
    close: 'Close',
  },
  look: {
    start: {
      title: 'Start with a photo',
      body: 'Robes reads every piece in it, and asks about each.',
      action: 'Add a photo',
    },
    reading: {
      eyebrow: 'One moment',
      title: 'Robes is finding the pieces.',
      aside: 'The top, for a start.',
    },
    eyebrow: 'The look',
    title: 'A look from a photo.',
    head: (n: number): string => `The look · ${n} ${piecesWord(n)}`,
    // The same head while the read runs, so the canvas never changes its label mid-read.
    headReading: 'The look · Reading',
    askMatch: (label: string): string => `Your ${label.toLowerCase()}?`,
    askNew: 'Not in your rack. New?',
    yes: 'Yes',
    find: 'No, find it',
    leaveOut: 'Leave it out',
    ctxNew: 'Robes files it on save',
    ctxMatch: (label: string): string => `Looks like the ${label.toLowerCase()}`,
    newRow: 'New · filed on save',
    remove: (label: string): string => `Take ${label} off the look`,
    gate: (n: number): string =>
      n === 1 ? 'One piece to confirm before you save.' : `${n} pieces to confirm before you save.`,
    wearToday: 'Wearing it today, log it worn',
    findTitle: (label: string): string => `Find the ${label.toLowerCase()}`,
    findNone: 'None of these — it’s new',
    findEmpty: 'Pick the piece it is',
    findGo: (label: string): string => `It’s the ${label.toLowerCase()}`,
    readFailed: 'Robes couldn’t read the pieces — the photo is kept, add them from your wardrobe.',
    empty: 'Robes couldn’t see a piece in that photo — it is kept as the record.',
    save: 'Save look',
    saving: 'Filing the pieces…',
    saveFailed: 'Robes couldn’t save that look. Try again.',
  },
} as const;

// The key-piece result, "Worn three ways" (legacy 7dfc96c, the native design).
export const keyPiece = {
  eyebrowYours: 'Key piece · yours',
  eyebrow: 'Key piece',
  pill: (pieces: number, yours: number): string =>
    `${pieces === 1 ? '1 piece' : `${pieces} pieces`}${yours ? ` · ${yours} yours` : ''}`,
  open: (title: string): string => `See ${title} piece by piece`,
  sheetLine: 'piece by piece.',
  inWardrobe: '✓ In your wardrobe',
  way: (n: number, total: number): string => `Look ${n} of ${total}`,
  saved: 'Saved',
} as const;

export const copy = {
  home,
  firstRun,
  lookbook,
  wardrobe,
  photoPieces,
  errors,
  auth,
  emails,
  onboarding,
  today,
  marketing,
  nav,
  jobs,
  devUpload,
  consent,
  ui,
  shell,
  looks,
  you,
  twin,
  plan,
  trips,
  share,
  notify,
  admin,
  keyPiece,
  legal,
} as const;
