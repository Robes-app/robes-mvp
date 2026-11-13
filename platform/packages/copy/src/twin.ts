import { asThey, type Presence } from './words';

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
    colouringSub: 'Skin, hair and season.',
    bodyShape: 'Body shape',
    bodyShapeSub: 'Set your line by hand.',
    // On a Robes model (plan 2026-11-05, design 3c): the eyebrow on the hero, the one commitment
    // (the camera), and the lineup she chooses from — her own twin first, once drawn.
    robesModel: 'Robes model',
    createTwin: 'Create your digital twin',
    // The colouring page's way to a season with no read yet.
    addSelfie: 'Add a close-up',
    // Under the lineup once anything of her twin is on file (design "Your model · Delete twin",
    // 12 Nov): while it is being built the button names the photograph.
    deleteTwin: {
      twin: 'Delete my digital twin',
      twinNote: 'Removes your photograph, model and measurements.',
      photo: 'Delete my photograph',
      photoNote: 'Removes your photograph and measurements, and stops your model being built.',
      title: 'Delete your digital twin?',
      // A deleted twin can be put back for 30 days, at her ask by email (owner, 13 Nov), so this
      // no longer says it can't be undone. TODO(founders): Annie's line to rewrite if she wants.
      body: 'Your photograph, model and measurements will be removed.',
      confirm: 'Delete',
      keep: 'Keep it',
    },
    // The one way to another selfie: the redraw control on her twin's hero (redlines R15).
    retake: 'Retake close-up to update your twin',
    // The selfie camera, its photo picker and the review (designs 03–05, Annie 10 Nov). She reads
    // "close-up" everywhere, as on the consent screen and in the Terms (Annie, 11 Nov).
    selfie: {
      title: 'Close-up',
      hint: 'Hair back · No glasses · Chin level',
      close: 'Close the camera',
      shutter: 'Take the close-up',
      photos: 'Choose from your photos',
      flip: 'Switch camera',
      review: 'Your close-up',
      reviewNote: 'Only used to draw your twin',
      retake: 'Retake',
      use: 'Use photo',
    },
    // Her yes before the camera (Annie's "Digital twin consent" artboard, 11 Nov; App Store
    // 5.1.2): it names Google Gemini, and nothing is photographed until the box is ticked.
    consent: {
      title: 'Your twin is you.',
      sub: 'And it’s yours.',
      rows: [
        ['Collects', 'A close-up and your size facts. Never your weight.'],
        ['Use', 'Your looks, shown on you. Never slimmed or smoothed.'],
        ['Made by', 'Google Gemini. It may process data outside the EU.'],
        ['Kept', 'Until you delete your twin or your account.'],
        ['Your controls', 'Delete your twin, or your account, any time.'],
      ],
      agree: 'I agree to Robes building my digital twin from my close-up and size facts.',
      privacy: 'Privacy',
      notNow: 'Not now',
      go: 'Take my close-up',
    },
    lineup: 'Choose a model',
    you: 'You',
    // The stage while her selfie reads and her twin draws (designs 06–07), one line at a time;
    // the last holds until her twin lands. A redraw with no selfie starts at the drawing.
    status: [
      'Reading your close-up',
      'Reading your colouring',
      'Drawing your model',
      'Finishing your twin',
    ],
    fewerSeasons: 'Fewer seasons',
    // The caption under her model: colour words only, never a shape.
    // Only what she chose or a close-up read: an unchosen skin or hair has no name to show.
    caption: (skin: string, hair: string): string =>
      [skin, hair ? `${String(hair).toLowerCase()} hair` : ''].filter(Boolean).join(' · '),
    twinFailed:
      'Robes couldn’t photograph your model just now. A close-up in daylight, facing the camera, helps.',
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
    skinAndHairRead: 'Read from your close-up. Change by hand.',
    skinAndHairHand: 'Chosen by hand until a close-up reads.',
    yourLine: 'Your line',
    edit: 'Edit',
    proportions: (presence: Presence): string =>
      `${presence === 'man' ? 'His' : asThey(presence) ? 'Their' : 'Her'} proportions`,
    adjust: 'Adjust by hand',
    scales: {
      shoulders: { label: 'Shoulders', less: 'Narrower', more: 'Broader' },
      bust: { label: 'Bust', less: 'Smaller', more: 'Fuller' },
      hips: { label: 'Hips', less: 'Narrower', more: 'Fuller' },
    },
    chest: 'Chest',
    asIs: (presence: Presence): string =>
      `As ${presence === 'man' ? 'he is' : asThey(presence) ? 'they are' : 'she is'}`,
    // A cell's spoken name: "Hips: much fuller".
    stop: (label: string, stop: number, less: string, more: string, asIs: string): string =>
      `${label}: ${stop === 0 ? asIs : `${Math.abs(stop) === 2 ? 'much ' : ''}${String(stop < 0 ? less : more).toLowerCase()}`}`,
    backToFacts: 'Back to your facts',
    gender: 'Gender',
    age: 'Age',
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
    genderOptions: {
      woman: 'Woman',
      man: 'Man',
      non_binary: 'Non-binary',
      unspecified: 'Prefer not to say',
    },
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
    you: 'You',
    taste: 'Your taste',
    words: 'In your words',
    styleType: 'Style type',
    brands: 'Brands',
    pieces: 'Pieces you love',
    investment: 'Investment level',
    loves: 'What works on you',
    // Her rules and hard nos, one row and one sheet: Always · Never (Style DNA redesign, 12 Nov).
    styleRules: 'Your style rules',
    notYet: 'Not yet',
    pickOne: 'Pick one',
    noneStarred: 'None starred',
    sometimes: (types: string): string => `sometimes ${types}`,
    piecesCount: (n: number): string => (n === 1 ? '1 piece' : `${n} pieces`),
    // A row's answer: the first name, then how many more ("Phoebe Philo +2"), never cut mid-word.
    firstPlus: (names: readonly string[]): string =>
      names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? ''),
    linesCount,
  },
  types: {
    title: 'Style type',
  },
  // The brand wall: onboarding's wordmark tiles under one search that also adds a house of her own.
  wall: {
    brandsTitle: 'Brands',
    searchBrands: 'Search or add a brand',
    add: (name: string): string => `Add “${name}”`,
  },
  pieces: {
    title: 'The pieces you love',
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
    loves: { title: 'What works on you', another: 'Another that works' },
    avoids: { another: 'Another no' },
    rules: { another: 'Another rule' },
    // The style rules sheet's tabs: rules are Always, hard nos are Never.
    always: 'Always',
    never: 'Never',
    first: 'A line of your own',
    add: 'Add the line',
    chip: (text: string): string => `Add “${text}”`,
    strike: (text: string): string => `Strike “${text}”`,
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
    // Follows the list name under a kept line: "Works · kept in October".
    keptIn: (month: string): string => `kept in ${month}`,
    // Written by the read onto each line it drafts (stored with the line).
    evidence: (pieces: number, looks: number): string =>
      pieces && looks
        ? `From ${pieces} pieces and ${looks} ${looks === 1 ? 'look' : 'looks'}`
        : pieces
          ? `From ${pieces} ${pieces === 1 ? 'piece' : 'pieces'} filed`
          : looks
            ? `From ${looks} ${looks === 1 ? 'look' : 'looks'}`
            : 'From your style type',
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
