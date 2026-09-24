// Every user-facing string lives here (SPEC principle 6); voice rules: brand-and-design.md §1.
// Keys are stable ids; values are en-GB. Use curly apostrophes (’) and no exclamation marks.

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
  eyebrow: 'Robes',
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
  legal: 'By continuing you agree to the Terms and Privacy notice.',
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
} as const;

export const marketing = {
  eyebrow: 'Robes',
  title: 'Your wardrobe, styled.',
  subtitle: 'One piece. Three ways to wear it.',
  signIn: 'Sign in',
} as const;

export const nav = {
  today: 'Today',
  wardrobe: 'Wardrobe',
  looks: 'Looks',
  plan: 'Plan',
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
  addPieces: 'Add pieces',
  choosePhotos: 'Choose photos',
  dropHint: 'Drop photos here, or choose them.',
  uploading: (done: number, total: number): string => `Uploading ${done} of ${total}…`,
  empty: {
    title: 'Your wardrobe starts here.',
    body: 'Add a few pieces and Robes will start styling them.',
  },
  deleted: 'Piece removed.',
  undo: 'Undo',
  segments: { pieces: 'Pieces', wishlist: 'Wishlist', inbox: 'Inbox' },
  removePiece: (label: string): string => `Remove ${label}`,
  photoAlt: (label: string): string => `Photo of ${label}`,
  wishlistEmpty: {
    title: 'Pieces you’re after live here.',
    body: 'Keep a list of what you want, then tell Robes when you buy it.',
  },
  inboxEmpty: {
    title: 'Pieces to check land here.',
    body: 'When Robes isn’t sure about a photo, it waits here for you.',
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
    remove: 'Remove',
    stylePiece: 'Style this piece',
  },
  wishlist: {
    addLabel: 'A piece you want',
    addPlaceholder: 'Black leather loafers',
    add: 'Add to wishlist',
    bought: 'I bought this',
    boughtToast: (label: string): string => `${label} is in your wardrobe now.`,
    removed: 'Removed from your wishlist.',
    remove: (label: string): string => `Remove ${label}`,
  },
  edit: 'Edit',
  addFailed: 'Robes couldn’t add those photos. Try again in a moment.',
  photosDenied: 'Allow Robes to see your photos in Settings to add pieces.',
  cameraDenied: 'Allow Robes to use the camera in Settings to photograph pieces.',
  category: 'Category',
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
  loading: 'One moment…',
  close: 'Close',
  dismiss: 'Dismiss',
  undo: 'Undo',
  notifications: 'Notifications ({hotkey})',
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
    photograph: 'Photograph pieces',
    cameraRoll: 'From camera roll',
    link: 'Paste a link',
    receipt: 'Forward a receipt',
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
  title: 'Looks',
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
    wearOnDay: 'Wear on a day',
    dayLabel: 'Day',
    addToPlan: 'Add to Plan',
    addedToPlan: 'Added to Plan.',
    saveAsNew: 'Save as new',
    savedAsNew: 'Saved as a new look.',
    remove: 'Remove',
    removed: 'Look removed.',
    imageAlt: (name: string): string => `The look: ${name}`,
    noPieces: 'No pieces yet.',
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
    chooseDay: 'Which day?',
    pinned: 'On your plan.',
    saveAsNew: 'Save as new',
    savedAsNew: 'Saved as a new look.',
    share: 'Share',
    stopSharing: 'Stop sharing',
    sharingStopped: 'Sharing turned off.',
  },
} as const;

// You area.
export const you = {
  title: 'You',
  account: {
    title: 'Account',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    emailHint: 'Your email signs you in, so it can’t be changed here.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
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
    title: 'Legal',
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
    lovedLabel: 'Colours you love on you',
    rejectedLabel: 'Colours you never wear',
    coloursHint: 'Separate with commas.',
    saveColours: 'Save',
    savedColours: 'Saved.',
    // Native screen (cards per read, colours edited one at a time).
    colour: {
      title: 'Your colouring',
      body: 'A close-up of your face in daylight, no filter.',
      add: 'Add a close-up',
      reading: 'Reading your colouring…',
      noSubject: 'Robes couldn’t see a face in that photo. Try another.',
    },
    silhouette: {
      title: 'Your shape',
      body: 'A full-length photo, standing straight, in fitted clothes.',
      add: 'Add a full-length photo',
      reading: 'Reading your shape…',
      noSubject: 'Robes couldn’t see your full figure in that photo. Try another.',
    },
    again: 'Try another photo',
    loved: 'Colours you love',
    rejected: 'Colours you don’t wear',
    colourLabel: 'Add a colour',
    colourPlaceholder: 'Navy',
    add: 'Add',
    removeColour: (name: string): string => `Remove ${name}`,
  },
} as const;

// Plan (M5): the rolling list of days.
export const plan = {
  title: 'Plan',
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
    title: 'Your days live here.',
    body: 'Open a look and choose Wear on a day.',
    action: 'Go to Looks',
  },
  monthSoon: 'Month view is on its way.',
} as const;

// Public share page and the share action.
export const share = {
  eyebrow: 'A look from Robes',
  by: (name: string): string => `Styled by ${name}`,
  pieces: 'The pieces',
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
  weekEmpty: {
    subject: 'Nothing planned this week.',
    body: 'Pin a look to a day and the week is dressed.',
    cta: 'Open the plan',
  },
  morning: {
    subject: (weekday: string, title: string): string => `${weekday} · ${title}`,
    body: (look: string): string => `Wearing ${look}.`,
    cta: 'Open the day',
    footer: 'Wore it? The look page takes it.',
    untitled: 'Your day',
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
} as const;

export const copy = {
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
  shell,
  looks,
  you,
  plan,
  share,
  notify,
} as const;
