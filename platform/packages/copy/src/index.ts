import { admin } from './admin';
import { bell, diary, firstRun, home } from './home';
import { legal } from './legal';
import { lookbook } from './lookbook';
import { twin } from './twin';
import { wardrobe } from './wardrobe';
import { asThey, countWord, type Presence } from './words';

// Every user-facing string lives here (SPEC principle 6); voice rules: brand-and-design.md §1.
// Keys are stable ids; values are en-GB. Use curly apostrophes (’) and no exclamation marks.
// The larger surfaces have their own files (admin, home, lookbook, twin, wardrobe), re-exported
// here so every caller still imports from '@robes/copy'.

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
  // For beta testers who signed in with a password (F4): one line, under the button.
  noPassword: 'Used a password? Robes emails you a code now.',
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
  // Native only: the web's provider flow reports back on its own page.
  socialFailed: 'Robes couldn’t sign you in. Try again.',
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
      text: (look: string, presence: Presence): string =>
        `Build your model and ${presence === 'man' ? 'he’ll' : asThey(presence) ? 'they’ll' : 'she’ll'} wear ${look}.`,
      door: 'Build your model',
    },
  },
  todayLooks: 'Today',
  worn: 'Worn',
  week: 'This week',
  weekDay: (label: string, looks: number): string =>
    looks === 0 ? `${label}, free` : `${label}, ${looks === 1 ? 'one look' : `${looks} looks`}`,
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
    presence?: Presence;
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

// SEC-84: answered in You › Privacy (the web's banner is gone, Annie 9 Nov).
export const consent = {
  failed: 'Robes couldn’t save that. Try again in a moment.',
  privacyEyebrow: 'You',
  privacyTitle: 'Privacy.',
  analyticsLabel: 'Usage counts',
  analyticsHint: 'Which screens you open and what you tap, so Robes can get better.',
  // Asked once on the phone, after sign-in, while she has given no answer (Annie's words, 11 Nov).
  askTitle: 'Allow usage counts?',
  askBody: 'Robes will learn from the screens you open and tap to improve.',
  askYes: 'Allow',
  askNo: 'Not now',
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
  // A sheet whose every tap already saved closes on a word, not an ×.
  done: 'Done',
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
  // The shared filter pattern (Front Door PRD rev 3 §2.5): the row's button and the sheet's header.
  filter: 'Filter',
  clear: 'Clear',
} as const;

// The shared filter pattern (Front Door PRD rev 3 §2.5): the row's chips, the sheet's sections
// and its one button. Seasons are the four plus Year round, the empty set (D12).
export const filters = {
  all: 'All',
  season: 'Season',
  wearFor: 'Wear it for',
  seasons: {
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
    winter: 'Winter',
    year_round: 'Year round',
  } as const,
  removeSeason: (season: string): string => `Remove ${season}`,
  showLooks: (n: number): string =>
    n === 0 ? 'No looks match' : n === 1 ? 'Show 1 look' : `Show ${n} looks`,
  showPieces: (n: number): string =>
    n === 0 ? 'No pieces match' : n === 1 ? 'Show 1 piece' : `Show ${n} pieces`,
  noLooks: 'No looks match.',
  clear: 'Clear filters',
} as const;

// App shell (IA §3.2): nav, Create sheet, command bar, placeholder routes.
export const shell = {
  primaryNav: 'Main',
  openYou: 'Your profile and settings',
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
  // A link to a page that isn't there (web not-found.tsx, native +not-found.tsx): one line, home.
  notFound: {
    title: 'Robes couldn’t find that.',
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
    rename: 'Rename',
    note: 'Notes',
    pieces: 'Pieces',
    dayLabel: 'Day',
    // A text link at the foot, rose; no glyph (Look redline 27 Oct).
    remove: 'Delete this look',
    removed: 'Look removed.',
    imageAlt: (name: string): string => `The look: ${name}`,
    noPieces: 'No pieces yet.',
    // On the photograph: the day it is worn, and her own picture of it (↻ once one is kept).
    addPhoto: 'Add your photograph',
    replacePhoto: 'Replace your photograph',
    photoNote: 'Wore this look? Add your photograph and it is kept alongside her.',
    // You / Model: with both pictures, she chooses which is the record — the Lookbook cover and
    // the diary thumbnail.
    record: {
      label: 'The record of this look',
      you: 'You',
      model: 'Model',
      kept: 'Kept as the record of this look',
    },
    // What the look is: the season, and what its pieces are worn for.
    tags: 'Tags',
    editTags: 'Edit tags',
    season: 'Season',
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
    removed: 'Look removed.',
    pieces: 'Pieces',
    imageAlt: (name: string): string => `The look: ${name}`,
    nameLabel: 'Name this look',
  },
} as const;

// You area.
export const you = {
  title: 'You',
  // The header row's title on the root (legacy settings.html): the avatar's door reads Settings.
  settings: 'Settings',
  helpEmail: 'hello@byrobes.com',
  // Settings' rows (Felix SettingsView, PR 8): one drill card per tab. Account keeps every row it
  // had (Annie, 7 Nov); the pages behind them keep their routes.
  rows: {
    details: 'Details',
    notifications: 'Notifications',
    // What waits behind the bell, as the Notifications row's value.
    newAlerts: (n: number): string => `${n} new`,
    receipts: 'Receipts',
    privacy: 'Privacy and data',
    help: 'Help',
  },
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
  // The row that holds her consents and her data export (decided 27 Oct: one "privacy" row only).
  privacy: 'Your data',
  legal: {
    terms: 'Terms',
    privacyNotice: 'Privacy notice',
  },
  signOut: 'Sign out',
  deletion: {
    title: 'Delete account',
    body: 'Robes signs you out and deletes your pieces, looks, photos and account. This can’t be undone.',
    confirmLabel: 'Type DELETE to confirm',
    confirm: 'Delete my account',
    requested: 'Your account is being deleted.',
  },
  style: {
    title: 'Your colours and shape',
    link: 'Colours and shape',
    colourTitle: 'Your colours',
    colourBody: 'A clear photo of your face in daylight, no filter.',
    silhouetteTitle: 'Your shape',
    silhouetteBody: 'A full-length photo, standing straight, in fitted clothes.',
    // The selfie's read (use-selfie): what it says when no face, or nothing, came back.
    noFace: 'Robes couldn’t see a face clearly. Try another photo.',
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
      // The row's value (Settings redline 27 Oct): what she loves, the first and a count
      // ("Blacks +2"), never cut mid-word and never the avoids; Not yet when she loves nothing.
      summary: (love: readonly string[]): string =>
        love.length > 1 ? `${love[0]} +${love.length - 1}` : (love[0] ?? 'Not yet'),
    },
    // Native's close-up card (Colouring).
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
    presenceOptions: {
      woman: 'Woman',
      man: 'Man',
      non_binary: 'Non-binary',
      unspecified: 'Prefer not to say',
    },
    skin: 'Skin',
    skinNames: ['Espresso', 'Mahogany', 'Chestnut', 'Tan', 'Honey', 'Sand', 'Peach', 'Porcelain'],
    hair: 'Hair',
    hairNames: ['Jet black', 'Espresso', 'Chestnut', 'Caramel', 'Ash blonde', 'Silver'],
    line: 'The line',
    lineOptions: { soft: 'Softer', none: 'As she is', straight: 'Straighter' },
    frame: 'The frame',
    frameOptions: { fuller: 'Fuller', none: 'As she is', narrower: 'Narrower' },
    creating: 'Creating your model…',
    failed: 'Robes couldn’t draw your model just now. Change a pick to try again.',
    imageAlt: 'Your model',
    dressing: 'Dressing your model…',
    // A render that failed says so, with the way back (never a stale picture passed off as new).
    undressed: 'Couldn’t dress your model · Try again',
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
    // Beta's empty diary with the trip hidden (legacy _dyListHtml).
    body: 'Name a day below and add a look. The diary keeps the dates; the lookbook keeps the looks.',
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
    // A day she wore a look carries it after the count (legacy .dy-r-worn).
    worn: 'Worn',
    open: (day: string): string => `Open ${day}`,
  },
  // The day page: the one door every day opens (legacy ff87e89).
  day: {
    back: (label: string): string => label,
    rename: 'Rename the day',
    name: 'Name the day',
    planned: 'Looks planned',
    filed: 'Looks filed',
    filedToday: 'Looks filed today',
    stat: (looks: number, pieces: number): string =>
      `${looks === 1 ? '1 look' : `${looks} looks`}${pieces ? ` · ${pieces === 1 ? '1 piece' : `${pieces} pieces`} filed` : ''}`,
    lookEyebrow: (n: number): string => `Look ${n}`,
    worn: 'Worn ✓',
    remove: (name: string): string => `Take ${name} off the day`,
    addAnother: 'Add a look',
    addAnotherHint: 'another moment in the day',
    choose: 'Choose from your looks',
    chooseHint: 'pick one or several',
    dress: 'Dress this day…',
    weatherLabel: 'The day’s weather',
    // After the conditions' icon: today the temperature now, a day ahead its range.
    weather: (city: string | null, condition: string, temp: string): string =>
      [city, condition, temp].filter(Boolean).join(' · '),
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

export { bell, diary, firstRun, home } from './home';
export { legal } from './legal';
export { lookbook } from './lookbook';

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
  bell,
  diary,
  lookbook,
  wardrobe,
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
  filters,
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

export { admin, countWord, twin, wardrobe };
