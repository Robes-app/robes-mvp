// The modular home (legacy 0478e63, Annie's Homepage_Modules) and the onboarding that leads to it
// (splash → name → the first piece → Composing → the deck).
const WORDS = [
  'no',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
];
const word = (n: number): string => WORDS[n] ?? String(n);
const Word = (n: number): string => {
  const w = word(n);
  return w.charAt(0).toUpperCase() + w.slice(1);
};
const pieces = (n: number): string => (n === 1 ? 'piece' : 'pieces');

export const home = {
  // H0: the standing question under the greeting.
  echo: 'What are you dressing for today?',
  weather: (city: string | null, tempRange: string, condition: string): string =>
    [city, tempRange, condition].filter(Boolean).join(' · '),
  weatherLabel: 'Today’s weather',
  // H2: the box reads "A new look for…" while onboarding, the contextual line once activated.
  doorHome: 'Tell Robes where you’re going, or the look you’re after…',
  doorDay: (day: string): string => `Dress ${day}…`,
  later: 'Later',
  map: {
    title: 'Getting to know you',
    steps: {
      O1: 'Your style',
      O2: 'Your digital twin',
      O3: 'Your wardrobe',
      O4: 'Your first look',
    },
    line: {
      O1: (done: boolean): string => (done ? 'Filed under Style DNA' : 'A brand, an icon, a style'),
      O2: (done: boolean): string => (done ? 'Your model is on file' : 'Two photographs'),
      O3: (n: number): string => (n ? `${Word(n)} ${pieces(n)} filed` : 'Nothing filed yet'),
      O4: (done: boolean): string => (done ? 'Built from your own pieces' : 'From your own pieces'),
    },
    done: 'Done',
  },
  o1: {
    eyebrow: 'Next · Style DNA',
    title: 'Your style,',
    titleEm: 'in brief.',
    bodyEmpty:
      'A few brands, an icon, the styles that feel like you. Every look Robes builds starts there.',
    body: 'A brand, an icon, a style. Robes dresses you from there.',
    one: 'Log your style notes',
    rows: { brands: 'Brands', icons: 'Icons', styles: 'Styles' },
    add: '+ Add',
    finish: 'Finish my style',
  },
  o2: {
    eyebrow: 'Next · Your digital twin',
    title: 'Two photographs,',
    titleEm: 'one model of you.',
    body: 'Robes builds your digital twin to model your looks.',
    closeUp: 'Close-up',
    full: 'Full length',
    cta: 'Add photographs',
  },
  o3: {
    eyebrow: 'Next · Your wardrobe',
    empty: 'Your wardrobe starts here.',
    filed: (n: number): string => `${Word(n)} ${pieces(n)} filed.`,
    rest: 'The rest in one go.',
    snap: {
      title: 'Snap several at once',
      line: 'A rail, a pile, a drawer. Robes files each piece.',
    },
    receipt: {
      title: 'Forward a receipt',
      line: 'Send an order email and Robes files what you bought.',
    },
  },
  o4: {
    eyebrow: 'Next · Your first look',
    title: 'Pick a piece,',
    titleEm: 'Robes dresses it.',
    body: 'Robes builds a draft look around it from what you own. Keep it or change it.',
    cta: 'Build the look',
    all: 'All pieces ›',
    pick: (label: string): string => `Build around ${label}`,
  },
  // H1: the receipt strip and one line Robes noticed.
  alerts: {
    label: 'For you',
    receiptFrom: (retailer: string | null, receipts: number): string =>
      receipts === 1
        ? `From your ${retailer ?? 'order'} receipt`
        : `From your ${word(receipts)} receipts`,
    receiptRead: (n: number): string => `${Word(n)} ${pieces(n)} read,`,
    receiptReady: 'ready to check.',
    review: 'Review ›',
    noticed: 'Robes noticed',
    keep: 'Keep ›',
    notMe: 'Not me',
  },
  // H3: the strip selects a day; its card sits beneath.
  week: {
    title: 'The week ahead',
    diary: 'Diary ›',
    today: 'Today',
    looks: (n: number): string => ` · ${n} looks`,
    dress: (day: string): string => `Dress ${day}`,
    dressToday: 'Dress today',
    dressLine: 'A look for the day, from the weather and your plans.',
    nothing: 'Nothing filed',
    woreIt: 'Wore it? Tap to log',
    worn: 'Worn ✓',
    open: (name: string): string => `Open ${name}`,
    select: (day: string): string => `Select ${day}`,
  },
  // H4: Saved looks then Suggested.
  saved: 'Saved looks',
  suggested: 'Suggested',
  viewAll: 'View all',
  aroundYour: (piece: string): string => `Around your ${piece}`,
  fromPrompt: 'From your prompt',
  // The + inside the box: a piece by photograph or from the wardrobe, then Build or Three ways.
  plus: {
    label: 'Add a piece',
    camera: 'Take a picture',
    cameraHint: 'Lay the piece flat, in good light.',
    upload: 'Upload a photo',
    wardrobe: 'From wardrobe',
    remove: 'Remove piece',
    styleThis: 'Style this piece',
    build: { title: 'Build a look', line: 'Start from this piece' },
    three: { title: 'Style it three ways', line: 'Robes proposes three' },
    justTaken: 'Just taken · Robes will file it',
    inWardrobe: (category: string): string => `${category} · in your wardrobe`,
    filedTo: (category: string): string => `${category} · filed to your wardrobe`,
    notFiled: 'Not filed yet — the looks still run',
    nothingFound: 'Robes couldn’t see a piece to file — the looks still run',
    filing: 'Filing it to your wardrobe…',
    placeholder: 'Where to? Optional',
    pickMode: 'Pick how Robes styles it.',
    emptyWardrobe: 'Nothing catalogued yet — take a picture of the piece instead',
    pickTitle: 'From your wardrobe',
    newPiece: 'New piece',
  },
} as const;

export const firstRun = {
  back: '← Back',
  progress: (step: number, of: number): string => `Step ${step} of ${of}`,
  name: {
    eyebrow: 'Hello',
    title: 'What should Robes',
    titleEm: 'call you?',
    label: 'First name',
    placeholder: 'Your first name',
    // The first week's notes (7-day brief, decision 1): named before any is sent.
    notes: 'Robes sends a few notes in your first week. Each one has a link to stop them.',
    continue: 'Continue',
  },
  piece: {
    eyebrow: (name: string | null): string => (name ? `${name}’s wardrobe` : 'Your wardrobe'),
    reading: 'Reading',
    filed: 'Filed',
    title: 'Add your',
    titleEm: 'first piece.',
    keyPiece: 'Your key piece',
    add: 'Add photo',
    retake: '↻ Retake',
    rows: ['The piece', 'Category', 'Brand', 'Colour', 'Cut'],
    awaiting: 'Awaiting',
    readingRow: 'Reading…',
    read: 'Read',
    unlabelled: 'Unlabelled',
    style: 'Style it three ways →',
    filing: 'Filing your piece…',
    wait: 'Robes is reading your piece…',
    skip: 'Skip for now',
    skipAnyway: 'Skip anyway — Robes styles only what you add',
    noPiece: 'Robes couldn’t find a piece in that photo — try a clear shot of the piece.',
    failed: 'Robes couldn’t read that piece just now — try again in a moment.',
    unreadable: 'Couldn’t read that image — try another file.',
  },
  compose: {
    title: 'Composing',
    titleEm: (name: string | null): string => (name ? `three looks, ${name}.` : 'three looks.'),
    lines: ['A first look', 'A second look', 'A third look'],
    dressing: 'dressing…',
    foot: 'Every look borrows the rest until you photograph your own.',
  },
} as const;
