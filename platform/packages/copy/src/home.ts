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
  // The temperature is today's live reading (or the day's range without one).
  weather: (city: string | null, temp: string, condition: string): string =>
    [city, temp, condition].filter(Boolean).join(' · '),
  weatherLabel: 'Today’s weather',
  // The meta line under the greeting (beta's H0), after the conditions' icon: the weekday, the
  // city, the temperature now. Read aloud with the conditions first, as the icon shows them.
  meta: (weekday: string, city: string | null, temp: string | null): string =>
    [weekday, city, temp].filter(Boolean).join(' · '),
  metaSpoken: (condition: string | null, meta: string): string =>
    [condition, meta].filter(Boolean).join(' · '),
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
    noticed: 'Observations',
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
  viewAllMore: 'View all ›',
  lookEyebrow: 'Look',
  aroundYour: (piece: string): string => `Around your ${piece}`,
  fromPrompt: 'From your prompt',
  // The + inside the box (legacy HomePrompt 2026-10-15): a piece by photograph or from the
  // wardrobe sits inside the box above her words, and Send is three looks around it.
  plus: {
    label: 'Add a piece',
    camera: 'Take a picture',
    cameraHint: 'Lay it flat, in good light.',
    upload: 'Upload a photo',
    uploadHint: 'A flat lay, or you wearing it.',
    wardrobe: 'From your wardrobe',
    wardrobeHint: 'Anything already filed.',
    remove: 'Remove piece',
    reading: 'Reading the piece…',
    readingSub: 'Robes will file it to your wardrobe',
    // "Style these jeans for…" / "Style this jumper for…"
    styleFor: (noun: { word: string; plural: boolean }): string =>
      `Style ${noun.plural ? 'these' : 'this'} ${noun.word} for…`,
    inWardrobe: (category: string): string => `${category} · in your wardrobe`,
    filedTo: (category: string): string => `${category} · filed to your wardrobe`,
    notFiled: 'Not filed yet — the looks still run',
    nothingFound: 'Robes couldn’t see a piece to file — the looks still run',
    filing: 'Filing it to your wardrobe…',
    placeholder: 'Where to? Optional',
    emptyWardrobe: 'Nothing catalogued yet — take a picture of the piece instead',
    pickTitle: 'From your wardrobe',
    newPiece: 'New piece',
  },
} as const;

// Onboarding, splash to home (handoff 30 Oct): name, identity, styles, brands, colours. Identity
// labels and the colour states are You's own (you.model.presenceOptions, you.style.palette.states).
export const firstRun = {
  backLabel: 'Back',
  backGlyph: '‹',
  progress: (step: number, of: number): string => `Step ${step} of ${of}`,
  eyebrow: 'Getting to know you',
  continue: 'Continue',
  finish: 'Get started',
  name: {
    title: 'What should Robes',
    titleEm: 'call you?',
    label: 'First name',
    placeholder: 'Your first name',
  },
  identity: { title: 'How do you', titleEm: 'identify?' },
  styles: {
    title: 'Which styles',
    titleEm: 'feel like you?',
    love: (style: string): string => `Love ${style}`,
  },
  brands: { title: 'Any favourite', titleEm: 'brands?' },
  colours: {
    title: 'Colours you',
    titleEm: 'love or avoid.',
    control: (family: string): string => `${family}: love, no view or avoid`,
  },
} as const;
