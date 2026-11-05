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

const ordinal = (n: number): string => {
  const rem = n % 100;
  const suffix = rem >= 11 && rem <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
};

// The bell (Front Door design 3k): what waits for her, each line with where it leads.
export const bell = {
  title: 'Notifications',
  open: 'Notifications',
  // The unread dot is never colour alone: the count lives in the bell's label.
  openNew: (n: number): string => (n > 0 ? `Notifications, ${n} new` : 'Notifications'),
  empty: 'Nothing new.',
  dismiss: 'Dismiss',
  dest: { receipts: 'Wardrobe', diary: 'Diary', overnight: 'Today' },
  overnight: (weekday: string): string => `Robes dressed you for ${weekday}`,
  receipts: (n: number): string => (n === 1 ? '1 receipt to review' : `${n} receipts to review`),
  receiptsLine: (retailers: readonly string[]): string | null => {
    const names = retailers.filter(Boolean).slice(0, 2);
    if (names.length === 0) return null;
    return `From ${names.join(' and ')}`;
  },
  logWear: (weekday: string): string => `Log ${weekday}’s wear`,
  logWearLine: (dayOfMonth: number): string => `Nothing filed for the ${ordinal(dayOfMonth)}`,
} as const;

const look = (n: number): string => (n === 1 ? 'look' : 'looks');

// The OOTD diary home (Front Door design 3a · 3k, plan 2026-11-02): the strip, the day's slot, the
// log sheet, the drawer, the day page, the prompt box's chips and flyout, and day one. `when` is
// the day in words: 'today', else 'on Tuesday'; `dayWord` 'today' or the weekday.
export const diary = {
  today: 'Today',
  strip: {
    label: 'The diary',
    page: (n: number): string =>
      n === 0 ? 'The week before' : n === 1 ? 'This week' : 'The week after',
    day: (label: string, looks: number, worn: boolean): string =>
      `${label}, ${worn ? 'worn' : looks === 0 ? 'free' : `${looks} ${look(looks)} planned`}`,
  },
  slot: {
    open: (name: string): string => `Open ${name}`,
    remove: (name: string, day: string): string => `Take ${name} off ${day}`,
    removed: 'Taken off the day.',
    change: 'Change the look from your lookbook',
    more: (n: number): string => `+${n}`,
    moreLabel: (n: number, day: string): string => `${n} more ${look(n)} on ${day}; open the day`,
    add: 'Add look',
    addLabel: (day: string): string => `Add a look to ${day}`,
  },
  log: {
    past: 'What did you wear?',
    today: 'What are you wearing?',
    ahead: 'What will you wear?',
    pick: 'Pick Look',
    capture: 'Capture Look',
  },
  drawer: {
    eyebrow: (dayWord: string, date: string): string => `${dayWord} · ${date}`,
    yourLooks: 'Your looks',
    lastWorn: 'Last worn ↓',
    firstWorn: 'First worn ↑',
    sortLabel: 'Order',
    refine: 'Refine',
    refineOn: (n: number): string => `Refine · ${n}`,
    search: 'Search by name or piece',
    season: 'Season',
    wearFor: 'Wear it for',
    none: 'No looks match.',
    clear: 'Clear refine',
    scheduled: 'Scheduled',
    adding: 'Adding',
    wears: (n: number): string => (n === 1 ? '1 wear' : `${n} wears`),
    savedOn: (day: string): string => `Saved ${day}`,
    notWorn: 'Not worn yet',
    idle: (day: string): string => `Tap looks to add or take off ${day}`,
    wearOne: (when: string): string => `Wear this look ${when}`,
    wearMany: (n: number, when: string): string => `Wear ${n} looks ${when}`,
    woreOne: (weekday: string): string => `Wore this on ${weekday}`,
    woreMany: (weekday: string): string => `Wore these on ${weekday}`,
    clearDay: (day: string): string => `Clear ${day}`,
    schedule: (n: number): string =>
      n === 0 ? 'Schedule Looks' : `Schedule ${n} ${n === 1 ? 'Look' : 'Looks'}`,
    empty: 'Nothing saved yet.',
    emptyLine: 'Save a look you like and it can go on a day.',
    toLooks: 'Go to Lookbook',
    added: (n: number, day: string): string =>
      n === 1 ? `Added to ${day}.` : `${n} looks added to ${day}.`,
    changed: (day: string): string => `${day}’s look changed.`,
    worn: (day: string): string => `Filed as worn on ${day}.`,
    cleared: (day: string): string => `${day} cleared.`,
  },
  day: {
    home: 'Home',
    name: 'Name the day',
    looksFor: 'Looks for the day',
    count: (n: number): string => `${n} ${look(n)}`,
    ootd: 'The OOTD',
    look: (n: number): string => `Look ${n}`,
    makeOotd: (name: string): string => `Make ${name} the OOTD`,
    isOotd: 'The OOTD on home',
    takeOff: (name: string): string => `Take ${name} off the day`,
    add: 'Add a look',
    weather: (city: string | null, condition: string, range: string): string =>
      [city, condition, range].filter(Boolean).join(' · '),
  },
  look: {
    saved: 'Saved look',
    edit: 'Edit look',
    meta: (pieces: number, wears: number, lastWorn: string | null): string =>
      [
        `${pieces} ${pieces === 1 ? 'piece' : 'pieces'}`,
        `${wears} ${wears === 1 ? 'wear' : 'wears'}`,
        lastWorn ? `last worn ${lastWorn}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
  },
  // The prompt box (design 3k): a passive day chip, the place chip with the day's range, the hanger.
  door: {
    today: 'Plan an outfit for today',
    day: (weekday: string): string => `Plan an outfit for ${weekday}`,
    send: 'Send',
    dayChip: (label: string): string => `For ${label}`,
    placeChip: (place: string, range: string | null): string =>
      range ? `${place}, ${range}` : place,
    changePlace: 'Change where you are that day',
    weatherOut: 'Leave the weather out',
    weather: 'Weather',
    weatherBack: 'Bring the weather back',
    pieces: 'Add pieces from your wardrobe',
    piecesOn: (n: number): string => `${n} ${n === 1 ? 'piece' : 'pieces'} to build around`,
    removePieces: 'Remove all pieces',
    removePiece: (label: string): string => `Remove ${label}`,
  },
  place: {
    search: 'Type a city',
    close: 'Close',
    forToday: 'For today only',
    forDay: (day: string): string => `For ${day} only`,
    recent: 'Home and recent',
    cities: 'Cities',
    home: 'Home',
    none: (q: string): string => `No match for “${q}”. Try another spelling.`,
  },
  flyout: {
    eyebrow: 'Add from your wardrobe',
    title: (dayWord: string): string => `Build ${dayWord} around`,
    cancel: 'Cancel',
    search: 'Search your wardrobe',
    all: 'All',
    photograph: 'Photograph one',
    adds: 'Adds straight in',
    idle: 'Tap pieces to add them',
    include: (n: number): string => `Include ${n} ${n === 1 ? 'Piece' : 'Pieces'}`,
    clear: 'Clear pieces',
    pick: (label: string): string => `Include ${label}`,
  },
  // Day one (design 3a): choose your model, add your first pieces.
  dayOne: {
    model: 'Choose your model',
    twin: 'Create your digital twin',
    // The five Robes models (plan 2026-11-05); "Another model" went with the fifth.
    modelPick: (n: number): string => `Model ${n}`,
    pieces: 'Add your first pieces',
    tiles: ['Tops', 'Bottoms', 'Shoes', 'Anything'] as const,
    browse: 'or browse files',
    tile: (what: string): string => `Photograph ${what.toLowerCase()}`,
    modelAsk: 'You can select another model in your profile at any time.',
    piecesAsk: 'You can add pieces in your Wardrobe at any time.',
    ok: 'Okay',
    dismiss: 'Dismiss',
  },
} as const;
