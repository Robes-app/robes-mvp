// The place she names (Liberty's Landscape-Aware Styling, 28 Oct; docs/stylist-reference-landscape.md
// at the repo root). A landscape is a styling consideration, never a style: it decides fabric,
// weight, footwear, layers and outerwear, and her own style decides the rest. Each entry carries only
// what the place asks of the clothes, in Liberty's words, and deliberately no visual field.
// Twin: the legacy app's `landscapes.js` holds the same data; change both together.

export type LandscapeKey =
  | 'city'
  | 'country'
  | 'coast'
  | 'mountains'
  | 'outdoors'
  | 'village'
  | 'resort'
  | 'desert'
  | 'tropics'
  | 'lakeside';

export interface Landscape {
  key: LandscapeKey;
  label: string;
  // Her client language, lower case, articles dropped.
  aliases: readonly string[];
  // Phrases that name a place only when nothing stronger does ("going into town" may be a village).
  weak?: readonly string[];
  consider: string;
  distinguish: string;
  // Liberty writes one per landscape (L4); empty until she has.
  avoid: string;
}

export const LANDSCAPES: readonly Landscape[] = [
  {
    key: 'city',
    label: 'the city',
    aliases: [
      'city',
      'urban',
      'city life',
      'city break',
      'weekend in the city',
      'downtown',
      'high street',
      'day of shopping',
      'city living',
      'urban setting',
      'metropolitan setting',
      'city weekend',
      'city nightlife',
      'creative city',
      'city sightseeing',
      'city workwear',
    ],
    weak: ['town', 'in town', 'out in town', 'going into town'],
    consider:
      'urban mobility, walking, public transport, changing weather, versatility and the social context; finer flat shoes for a day on foot',
    distinguish: 'corporate, creative, casual, sightseeing and evening settings',
    avoid: '',
  },
  {
    key: 'country',
    label: 'the country',
    aliases: [
      'country',
      'countryside',
      'out in the country',
      'rural',
      'country weekend',
      'country escape',
      'countryside escape',
      'rural getaway',
      'weekend away in the country',
      'country living',
      'country life',
      'country retreat',
      'country estate',
      'farm stay',
      'rural setting',
      'country walk',
      'country pub',
      'day in the fields',
      'country casual',
      'muddy dog walk',
      'country house weekend',
      'country pub lunch',
      'rural wedding',
      'countryside retreat',
      'countryside walk',
      'cotswolds',
    ],
    weak: ['out of town'],
    consider:
      'natural textures, versatile layers, weather-ready outerwear and footwear suited to the terrain (flat trainers, wellington boots, hardy boots)',
    distinguish: 'rural activities, country-house occasions and relaxed countryside weekends',
    avoid:
      'traditional or heritage country clothing by default; read the place through her own style',
  },
  {
    key: 'coast',
    label: 'the coast',
    aliases: [
      'coast',
      'coastal',
      'by the sea',
      'seaside',
      'at the seaside',
      'seaside town',
      'seaside escape',
      'coastal getaway',
      'beach holiday',
      'at the beach',
      'beach',
      'beachside',
      'beach town',
      'beach resort',
      'on the waterfront',
      'by the water',
      'coastal walk',
      'weekend by the sea',
      'seaside weekend',
      'coastal retreat',
      'beachwear',
      'beach to bar',
      'seaside casual',
      'coastal town',
      'coastal walking',
    ],
    consider:
      'wind, sun, salt air, temperature changes, breathable fabrics and what she is doing there',
    distinguish:
      'a British seaside town, a Mediterranean resort, a beach club, a coastal walk and a day on the sand',
    avoid: '',
  },
  {
    key: 'mountains',
    label: 'the mountains',
    aliases: [
      'mountains',
      'mountain',
      'mountain getaway',
      'mountain retreat',
      'up in the mountains',
      'mountain town',
      'alpine',
      'alps',
      'ski resort',
      'going to the snow',
      'ski trip',
      'ski holiday',
      'ski',
      'skiing',
      'apres ski',
      'mountain village',
      'hiking holiday',
      'walking holiday',
      'cabin in the mountains',
      'mountain escape',
      'weekend in the alps',
      'high altitude',
      'mountain lodge',
      'ski wear',
      'mountain casual',
      'alpine chic',
      'winter resort',
    ],
    consider: 'protection, insulation, movement and footwear for the terrain',
    distinguish:
      'skiing or hiking, which may need technical pieces, from a mountain lodge or a resort dinner, which can be fashion-led',
    avoid: '',
  },
  {
    key: 'outdoors',
    label: 'the outdoors',
    aliases: [
      'outdoors',
      'out in nature',
      'in nature',
      'great outdoors',
      'outdoor adventure',
      'out walking',
      'long walk',
      'hiking',
      'hike',
      'on a hike',
      'walking trails',
      'woods',
      'woodland',
      'forest',
      'camping',
      'glamping',
      'countryside walk',
      'exploring nature',
      'nature retreat',
      'weekend outdoors',
      'woodland walk',
    ],
    weak: ['outside'],
    consider:
      'the activity, the terrain and the weather; protection, movement and footwear for the ground',
    distinguish: 'a woodland walk, a camping trip and a lakeside lunch',
    avoid: '',
  },
  {
    key: 'village',
    label: 'a village',
    aliases: [
      'village',
      'village life',
      'village weekend',
      'village escape',
      'country village',
      'small town',
      'small town life',
      'market town',
      'village pub',
      'village cafe',
      'local market',
      'cotswolds',
      'european village',
      'french village',
      'italian village',
      'greek village',
      'historic town',
      'picturesque village',
      'market day',
    ],
    consider: 'relaxed everyday dressing, the local climate, walking and casual social occasions',
    distinguish:
      'a paved village and a remote rural setting; a Greek island village in summer and an English market town in autumn',
    avoid: '',
  },
  {
    key: 'resort',
    label: 'a resort',
    aliases: [
      'resort',
      'resort holiday',
      'beach resort',
      'luxury resort',
      'spa resort',
      'ski resort',
      'tropical getaway',
      'luxury escape',
      'resort town',
      'five star hotel',
      'poolside',
      'beach club',
      'hotel by the sea',
      'wellness retreat',
      'spa weekend',
      'resort dinner',
      'mediterranean holiday',
      'riviera',
      'resort wear',
      'resort dressing',
      'apres ski',
    ],
    weak: ['holiday', 'on holiday', 'vacation', 'summer holiday', 'winter holiday'],
    consider:
      'the climate, the destination, the itinerary, luggage limits and the move from day to evening',
    distinguish: 'the kind of holiday it is (beach, spa, ski or city) before assuming anything',
    avoid: '',
  },
  {
    key: 'desert',
    label: 'the desert',
    aliases: [
      'desert',
      'desert landscape',
      'desert escape',
      'desert retreat',
      'desert holiday',
      'desert safari',
      'desert camp',
      'desert resort',
      'dunes',
      'sand dunes',
      'desert adventure',
      'desert road trip',
      'desert hiking',
      'marrakech',
      'morocco',
      'dubai',
      'arizona',
      'palm springs',
    ],
    consider:
      'daytime heat, cooler evenings, wind, terrain, cultural norms and the actual activity',
    distinguish: 'destinations that share a desert but not a climate or a dress expectation',
    avoid: '',
  },
  {
    key: 'tropics',
    label: 'the tropics',
    aliases: [
      'tropics',
      'tropical holiday',
      'tropical getaway',
      'tropical island',
      'island life',
      'island escape',
      'jungle retreat',
      'rainforest',
      'tropical resort',
      'caribbean',
      'island holiday',
      'safari lodge',
      'jungle adventure',
      'rainforest holiday',
      'bali',
      'thailand',
    ],
    consider: 'heat, humidity and rainfall, which decide fabric and layering',
    distinguish: 'a beach and everywhere else: not every tropical destination is a beach',
    avoid: '',
  },
  {
    key: 'lakeside',
    label: 'a lake or river',
    aliases: [
      'by the lake',
      'lakeside',
      'lake district',
      'lake house',
      'weekend by the lake',
      'by the river',
      'riverside',
      'riverside escape',
      'river walk',
      'waterfront weekend',
      'lakeside retreat',
      'lake holiday',
      'boating weekend',
      'house by the water',
      'weekend on the water',
      'lakeside lunch',
      'riverside walk',
      'boating',
    ],
    consider: 'wind, temperature and how close she is to the water',
    distinguish: 'an active boating day, a walk by the water and a meal at a waterfront restaurant',
    avoid: '',
  },
];

// Named places in Liberty's lists. Each is a destination as well as a landscape: the weather is
// read there.
export const NAMED_PLACES: Readonly<Record<string, string>> = {
  cotswolds: 'the Cotswolds',
  alps: 'the Alps',
  marrakech: 'Marrakech',
  morocco: 'Morocco',
  dubai: 'Dubai',
  arizona: 'Arizona',
  'palm springs': 'Palm Springs',
  caribbean: 'the Caribbean',
  bali: 'Bali',
  thailand: 'Thailand',
  riviera: 'the Riviera',
  'lake district': 'the Lake District',
};

// What she is doing there: the clarify rule and the footwear turn on it.
const ACTIVITIES: readonly [RegExp, string][] = [
  [/\bmuddy dog walk\b|\bdog walk\b/, 'a dog walk'],
  [/\bapres ski\b/, 'après-ski'],
  [/\bski(ing)?\b/, 'skiing'],
  [/\bhik(e|es|ing)\b/, 'hiking'],
  [/\bcamping\b|\bglamping\b/, 'camping'],
  [/\bboat(ing)?\b|\bsailing\b/, 'on the water'],
  [/\bswim(ming)?\b|\bpoolside\b|\bpool\b/, 'by the pool'],
  [/\bbeach to bar\b/, 'beach to bar'],
  [/\bwalk(s|ing)?\b/, 'walking'],
  [/\blunch\b/, 'lunch'],
  [/\bdinner\b|\bsupper\b/, 'dinner'],
  [/\bdrinks\b|\bcocktails?\b/, 'drinks'],
  [/\bwedding\b/, 'a wedding'],
  [/\bsightseeing\b/, 'sightseeing'],
];

export interface PlaceRead {
  // Matched landscapes, strongest first, at most two (Liberty's rule 6: they can coexist).
  landscapes: LandscapeKey[];
  activity: string | null;
  // A place she wrote, to read the weather at. Never inferred: a named place from the list, or a
  // capitalised name after in/to/around that the geocoder must still confirm.
  destination: string | null;
  // True when the destination is one of Liberty's named places (known to be a place even if the
  // geocoder cannot find it).
  named: boolean;
}

const EMPTY: PlaceRead = { landscapes: [], activity: null, destination: null, named: false };

export function normalisePlaceText(text: string): string {
  return ` ${text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9&]+/g, ' ')
    .trim()} `;
}

const has = (norm: string, phrase: string) => norm.includes(` ${phrase} `);

// "Resort" as the fashion season (Liberty's note), not a holiday: never a landscape.
const RESORT_SEASON = /\bresort\s+(collection|season|\d{2,4})\b|\b(cruise|pre fall)\s+collection\b/;

// Words that read capitalised but are never a place.
const NOT_PLACES = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'christmas',
  'easter',
  'halloween',
  'i',
  'my',
  'robes',
]);

// A capitalised name after in / to / around / visiting, as she wrote it ("a weekend in Lisbon").
// shortcut: needs the capital; a lower-case place name is read only when it is one of NAMED_PLACES.
export function capturePlaceName(text: string): string | null {
  const re =
    /\b(?:in|to|around|visiting)\s+(?:the\s+)?((?:\p{Lu}[\p{L}'’.-]*)(?:\s+(?:\p{Lu}[\p{L}'’.-]*|de|del|di|la|le|sur|am|upon|on))*)/gu;
  for (const m of text.matchAll(re)) {
    const words = (m[1] ?? '').split(/\s+/);
    const kept: string[] = [];
    for (const w of words) {
      if (NOT_PLACES.has(w.toLowerCase().replace(/[’'.]/g, ''))) break;
      kept.push(w);
    }
    while (kept.length && /^(de|del|di|la|le|sur|am|upon|on)$/.test(kept[kept.length - 1] ?? ''))
      kept.pop();
    const name = kept.join(' ').replace(/[.’']+$/, '');
    if (name.length >= 2) return name.slice(0, 60);
  }
  return null;
}

export function readPlace(text: string | null | undefined): PlaceRead {
  const raw = String(text ?? '').slice(0, 600);
  if (!raw.trim()) return EMPTY;
  const norm = normalisePlaceText(raw);
  const seasonal = RESORT_SEASON.test(norm);
  const hit = (l: Landscape, list: readonly string[] | undefined) => {
    let at = -1;
    for (const a of list ?? []) {
      if (l.key === 'resort' && seasonal && /\bresort\b/.test(a)) continue;
      const i = norm.indexOf(` ${a} `);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    return at;
  };
  const strong = LANDSCAPES.map((l) => ({ key: l.key, at: hit(l, l.aliases) })).filter(
    (x) => x.at >= 0,
  );
  const found = strong.length
    ? strong
    : LANDSCAPES.map((l) => ({ key: l.key, at: hit(l, l.weak) })).filter((x) => x.at >= 0);
  const landscapes = found
    .sort((a, b) => a.at - b.at)
    .slice(0, 2)
    .map((x) => x.key);
  const activity = ACTIVITIES.find(([re]) => re.test(norm))?.[1] ?? null;
  const namedKey = Object.keys(NAMED_PLACES).find((k) => has(norm, k));
  const named = namedKey ? (NAMED_PLACES[namedKey] ?? null) : null;
  const destination = named ?? capturePlaceName(raw);
  return { landscapes, activity, destination, named: Boolean(named) };
}

export function landscapeOf(key: LandscapeKey): Landscape | undefined {
  return LANDSCAPES.find((l) => l.key === key);
}

// One rule on every stylist prompt, matched or not (Liberty's success criterion).
export const PLACE_RULE =
  'A place she names is a practical input, never a style: it decides fabric, weight, footwear, layers and outerwear, and the look still reads as hers, never a generic outfit made from the place’s name.';

// THE PLACE: rendered only when a landscape matched, from this vocabulary alone (none of her words).
export function placeBlock(read: Pick<PlaceRead, 'landscapes' | 'activity'>): string {
  const ls = read.landscapes.map(landscapeOf).filter((l): l is Landscape => Boolean(l));
  if (!ls.length) return '';
  const head = `THE PLACE — ${ls.map((l) => l.label).join(' and ')}${read.activity ? ` · ${read.activity}` : ''}. The place decides fabric, weight, footwear, layers and outerwear; her own style decides everything else. Dress her, in her own register, for it — never a costume of it.`;
  const lines = [head];
  for (const l of ls) {
    const pre = ls.length > 1 ? `${l.label[0]?.toUpperCase()}${l.label.slice(1)}: ` : '';
    lines.push(`${pre}consider ${l.consider}. Distinguish ${l.distinguish}.`);
    if (l.avoid) lines.push(`${pre}never ${l.avoid}.`);
  }
  return lines.join('\n');
}

// Where the look is for, against where she is: the weather line follows the place she names.
export type WeatherRung = 'there' | 'season' | 'home' | 'today';

export interface PlaceWeather {
  place: string;
  tempRange: string | null;
  condition: string | null;
  // A typical reading for the date (last year's), not a live forecast.
  seasonal: boolean;
}

export interface PlaceLineInput {
  dayLabel: string | null;
  month: string | null;
  // Her own city's reading, as before.
  home: { city: string | null; tempRange: string | null; condition: string | null };
  read: PlaceRead;
  // The destination's weather when it was found (null: not found, or no destination).
  there: PlaceWeather | null;
}

const clip = (s: string | null | undefined, n: number) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

export function placeWeatherLine(i: PlaceLineInput): { line: string; rung: WeatherRung } {
  const day = clip(i.dayLabel, 40);
  const month = clip(i.month, 20);
  if (i.there) {
    const place = clip(i.there.place, 80);
    const reading = [clip(i.there.tempRange, 24), clip(i.there.condition, 40)]
      .filter(Boolean)
      .join(', ');
    if (reading) {
      return {
        rung: 'there',
        line: `She is dressing for ${place}${day ? `, ${day}` : ''}. ${i.there.seasonal ? `Typical weather there for that date: ${reading}` : `Forecast there: ${reading}`}. Dress her for exactly this weather and place, not for where she is now.`,
      };
    }
  }
  const named = i.there?.place ?? (i.read.named ? i.read.destination : null);
  if (named) {
    return {
      rung: 'season',
      line: `She is dressing for ${clip(named, 80)}${month ? ` in ${month}` : ''}${day ? ` (${day})` : ''}. Dress her for its climate then, not for where she is now.`,
    };
  }
  const reading = [i.home.city, month].filter(Boolean).join(' · ');
  const wx = `${i.home.tempRange ? ` | ${clip(i.home.tempRange, 24)}` : ''}${i.home.condition ? ` | ${clip(i.home.condition, 40)}` : ''}`;
  const hasHome = Boolean(i.home.city || i.home.tempRange);
  if (i.read.landscapes.length) {
    const lead = day ? `She is dressing for ${day}. ` : '';
    return {
      rung: 'home',
      line: hasHome
        ? `${lead}Where she is now: ${reading}${wx}. Her words put the look somewhere else; read this only as a guide to the season.`
        : day
          ? `${lead}Dress for the season and the place she names.`
          : '',
    };
  }
  if (hasHome) {
    return {
      rung: 'today',
      line: `${day ? `She is dressing for ${day}. Forecast for that day` : 'Real-time context'}: ${reading}${wx}. Dress the user for exactly this weather and place.`,
    };
  }
  return {
    rung: 'today',
    line: day
      ? `She is dressing for ${day}${month ? ` (${month})` : ''}. No forecast reaches that far — dress for the season and the place.`
      : '',
  };
}

// The geocoder's answer for a place she named, accepted only when it is a real place of some size
// and far enough from home to be somewhere else (a London neighbourhood is not a trip).
export interface GeoHit {
  name: string;
  country: string;
  lat: number;
  lon: number;
  featureCode: string;
  population: number | null;
}

const AREA_CODES = /^(PCL|ADM|RGN|AREA|ISL|MT|PK|LK|RES|PRK|TERR|CONT|VAL|DSRT|BCH|CST|PEN|BAY)/;

export function acceptableHit(h: GeoHit): boolean {
  const code = h.featureCode.toUpperCase();
  if (code === 'PPLX' || code === 'PPLH' || code === 'PPLQ') return false;
  if (code.startsWith('PPL')) {
    if (code === 'PPLC' || code === 'PPLA' || code === 'PPLA2') return true;
    return (h.population ?? 0) >= 10_000;
  }
  return AREA_CODES.test(code);
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
}

// What the geocoder is asked: her place without a leading article ("the Cotswolds" → Cotswolds).
export function geocodeQuery(place: string): string {
  return place
    .replace(/^the\s+/i, '')
    .trim()
    .slice(0, 60);
}

// Nearer than this to her home is home: its weather is hers already.
export const HOME_RADIUS_KM = 60;

// The first acceptable hit whose name starts the way she wrote it; null when none, or when it is
// at home (a destination a few streets away is not somewhere else).
export function pickDestination(
  hits: readonly GeoHit[],
  wrote: string,
  home: { lat: number; lon: number } | null,
): GeoHit | null {
  const want = normalisePlaceText(geocodeQuery(wrote)).trim();
  // Whole words only: "Town" is never Townsville, "Palma de Mallorca" may be Palma.
  const same = (name: string) => {
    const n = normalisePlaceText(name).trim();
    return n === want || n.startsWith(`${want} `) || want.startsWith(`${n} `);
  };
  const hit = hits.find((h) => acceptableHit(h) && same(h.name));
  if (!hit) return null;
  if (home && distanceKm(home, hit) < HOME_RADIUS_KM) return null;
  return hit;
}
