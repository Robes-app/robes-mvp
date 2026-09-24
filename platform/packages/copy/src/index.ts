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
    requested: 'Your account is being deleted. Robes will email you when it’s done.',
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
} as const;
