// GENERATED from platform/packages/core/src/landscape/index.ts by scripts/gen_landscapes.mjs.
// Do not edit here: edit the source and regenerate (scripts/landscape_test.mjs pins the copy).
const LANDSCAPES = [
  {
    key: "city",
    label: "the city",
    aliases: [
      "city",
      "urban",
      "city life",
      "city break",
      "weekend in the city",
      "downtown",
      "high street",
      "day of shopping",
      "city living",
      "urban setting",
      "metropolitan setting",
      "city weekend",
      "city nightlife",
      "creative city",
      "city sightseeing",
      "city workwear"
    ],
    weak: ["town", "in town", "out in town", "going into town"],
    consider: "urban mobility, walking, public transport, changing weather, versatility and the social context; finer flat shoes for a day on foot",
    distinguish: "corporate, creative, casual, sightseeing and evening settings",
    avoid: ""
  },
  {
    key: "country",
    label: "the country",
    aliases: [
      "country",
      "countryside",
      "out in the country",
      "rural",
      "country weekend",
      "country escape",
      "countryside escape",
      "rural getaway",
      "weekend away in the country",
      "country living",
      "country life",
      "country retreat",
      "country estate",
      "farm stay",
      "rural setting",
      "country walk",
      "country pub",
      "day in the fields",
      "country casual",
      "muddy dog walk",
      "country house weekend",
      "country pub lunch",
      "rural wedding",
      "countryside retreat",
      "countryside walk",
      "cotswolds"
    ],
    weak: ["out of town"],
    consider: "natural textures, versatile layers, weather-ready outerwear and footwear suited to the terrain (flat trainers, wellington boots, hardy boots)",
    distinguish: "rural activities, country-house occasions and relaxed countryside weekends",
    avoid: "traditional or heritage country clothing by default; read the place through her own style"
  },
  {
    key: "coast",
    label: "the coast",
    aliases: [
      "coast",
      "coastal",
      "by the sea",
      "seaside",
      "at the seaside",
      "seaside town",
      "seaside escape",
      "coastal getaway",
      "beach holiday",
      "at the beach",
      "beach",
      "beachside",
      "beach town",
      "beach resort",
      "on the waterfront",
      "by the water",
      "coastal walk",
      "weekend by the sea",
      "seaside weekend",
      "coastal retreat",
      "beachwear",
      "beach to bar",
      "seaside casual",
      "coastal town",
      "coastal walking"
    ],
    consider: "wind, sun, salt air, temperature changes, breathable fabrics and what she is doing there",
    distinguish: "a British seaside town, a Mediterranean resort, a beach club, a coastal walk and a day on the sand",
    avoid: ""
  },
  {
    key: "mountains",
    label: "the mountains",
    aliases: [
      "mountains",
      "mountain",
      "mountain getaway",
      "mountain retreat",
      "up in the mountains",
      "mountain town",
      "alpine",
      "alps",
      "ski resort",
      "going to the snow",
      "ski trip",
      "ski holiday",
      "ski",
      "skiing",
      "apres ski",
      "mountain village",
      "hiking holiday",
      "walking holiday",
      "cabin in the mountains",
      "mountain escape",
      "weekend in the alps",
      "high altitude",
      "mountain lodge",
      "ski wear",
      "mountain casual",
      "alpine chic",
      "winter resort"
    ],
    consider: "protection, insulation, movement and footwear for the terrain",
    distinguish: "skiing or hiking, which may need technical pieces, from a mountain lodge or a resort dinner, which can be fashion-led",
    avoid: ""
  },
  {
    key: "outdoors",
    label: "the outdoors",
    aliases: [
      "outdoors",
      "out in nature",
      "in nature",
      "great outdoors",
      "outdoor adventure",
      "out walking",
      "long walk",
      "hiking",
      "hike",
      "on a hike",
      "walking trails",
      "woods",
      "woodland",
      "forest",
      "camping",
      "glamping",
      "countryside walk",
      "exploring nature",
      "nature retreat",
      "weekend outdoors",
      "woodland walk"
    ],
    weak: ["outside"],
    consider: "the activity, the terrain and the weather; protection, movement and footwear for the ground",
    distinguish: "a woodland walk, a camping trip and a lakeside lunch",
    avoid: ""
  },
  {
    key: "village",
    label: "a village",
    aliases: [
      "village",
      "village life",
      "village weekend",
      "village escape",
      "country village",
      "small town",
      "small town life",
      "market town",
      "village pub",
      "village cafe",
      "local market",
      "cotswolds",
      "european village",
      "french village",
      "italian village",
      "greek village",
      "historic town",
      "picturesque village",
      "market day"
    ],
    consider: "relaxed everyday dressing, the local climate, walking and casual social occasions",
    distinguish: "a paved village and a remote rural setting; a Greek island village in summer and an English market town in autumn",
    avoid: ""
  },
  {
    key: "resort",
    label: "a resort",
    aliases: [
      "resort",
      "resort holiday",
      "beach resort",
      "luxury resort",
      "spa resort",
      "ski resort",
      "tropical getaway",
      "luxury escape",
      "resort town",
      "five star hotel",
      "poolside",
      "beach club",
      "hotel by the sea",
      "wellness retreat",
      "spa weekend",
      "resort dinner",
      "mediterranean holiday",
      "riviera",
      "resort wear",
      "resort dressing",
      "apres ski"
    ],
    weak: ["holiday", "on holiday", "vacation", "summer holiday", "winter holiday"],
    consider: "the climate, the destination, the itinerary, luggage limits and the move from day to evening",
    distinguish: "the kind of holiday it is (beach, spa, ski or city) before assuming anything",
    avoid: ""
  },
  {
    key: "desert",
    label: "the desert",
    aliases: [
      "desert",
      "desert landscape",
      "desert escape",
      "desert retreat",
      "desert holiday",
      "desert safari",
      "desert camp",
      "desert resort",
      "dunes",
      "sand dunes",
      "desert adventure",
      "desert road trip",
      "desert hiking",
      "marrakech",
      "morocco",
      "dubai",
      "arizona",
      "palm springs"
    ],
    consider: "daytime heat, cooler evenings, wind, terrain, cultural norms and the actual activity",
    distinguish: "destinations that share a desert but not a climate or a dress expectation",
    avoid: ""
  },
  {
    key: "tropics",
    label: "the tropics",
    aliases: [
      "tropics",
      "tropical holiday",
      "tropical getaway",
      "tropical island",
      "island life",
      "island escape",
      "jungle retreat",
      "rainforest",
      "tropical resort",
      "caribbean",
      "island holiday",
      "safari lodge",
      "jungle adventure",
      "rainforest holiday",
      "bali",
      "thailand"
    ],
    consider: "heat, humidity and rainfall, which decide fabric and layering",
    distinguish: "a beach and everywhere else: not every tropical destination is a beach",
    avoid: ""
  },
  {
    key: "lakeside",
    label: "a lake or river",
    aliases: [
      "by the lake",
      "lakeside",
      "lake district",
      "lake house",
      "weekend by the lake",
      "by the river",
      "riverside",
      "riverside escape",
      "river walk",
      "waterfront weekend",
      "lakeside retreat",
      "lake holiday",
      "boating weekend",
      "house by the water",
      "weekend on the water",
      "lakeside lunch",
      "riverside walk",
      "boating"
    ],
    consider: "wind, temperature and how close she is to the water",
    distinguish: "an active boating day, a walk by the water and a meal at a waterfront restaurant",
    avoid: ""
  }
];
const NAMED_PLACES = {
  cotswolds: "the Cotswolds",
  alps: "the Alps",
  marrakech: "Marrakech",
  morocco: "Morocco",
  dubai: "Dubai",
  arizona: "Arizona",
  "palm springs": "Palm Springs",
  caribbean: "the Caribbean",
  bali: "Bali",
  thailand: "Thailand",
  riviera: "the Riviera",
  "lake district": "the Lake District"
};
const ACTIVITIES = [
  [/\bmuddy dog walk\b|\bdog walk\b/, "a dog walk"],
  [/\bapres ski\b/, "apr\xE8s-ski"],
  [/\bski(ing)?\b/, "skiing"],
  [/\bhik(e|es|ing)\b/, "hiking"],
  [/\bcamping\b|\bglamping\b/, "camping"],
  [/\bboat(ing)?\b|\bsailing\b/, "on the water"],
  [/\bswim(ming)?\b|\bpoolside\b|\bpool\b/, "by the pool"],
  [/\bbeach to bar\b/, "beach to bar"],
  [/\bwalk(s|ing)?\b/, "walking"],
  [/\blunch\b/, "lunch"],
  [/\bdinner\b|\bsupper\b/, "dinner"],
  [/\bdrinks\b|\bcocktails?\b/, "drinks"],
  [/\bwedding\b/, "a wedding"],
  [/\bsightseeing\b/, "sightseeing"]
];
const EMPTY = { landscapes: [], activity: null, destination: null, named: false };
function normalisePlaceText(text) {
  return ` ${text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9&]+/g, " ").trim()} `;
}
const has = (norm, phrase) => norm.includes(` ${phrase} `);
const RESORT_SEASON = /\bresort\s+(collection|season|\d{2,4})\b|\b(cruise|pre fall)\s+collection\b/;
const NOT_PLACES = /* @__PURE__ */ new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "christmas",
  "easter",
  "halloween",
  "i",
  "my",
  "robes"
]);
function capturePlaceName(text) {
  const re = /\b(?:in|to|around|visiting)\s+(?:the\s+)?((?:\p{Lu}[\p{L}'’.-]*)(?:\s+(?:\p{Lu}[\p{L}'’.-]*|de|del|di|la|le|sur|am|upon|on))*)/gu;
  for (const m of text.matchAll(re)) {
    const words = (m[1] ?? "").split(/\s+/);
    const kept = [];
    for (const w of words) {
      if (NOT_PLACES.has(w.toLowerCase().replace(/[’'.]/g, ""))) break;
      kept.push(w);
    }
    while (kept.length && /^(de|del|di|la|le|sur|am|upon|on)$/.test(kept[kept.length - 1] ?? ""))
      kept.pop();
    const name = kept.join(" ").replace(/[.’']+$/, "");
    if (name.length >= 2) return name.slice(0, 60);
  }
  return null;
}
function readPlace(text) {
  const raw = String(text ?? "").slice(0, 600);
  if (!raw.trim()) return EMPTY;
  const norm = normalisePlaceText(raw);
  const seasonal = RESORT_SEASON.test(norm);
  const hit = (l, list) => {
    let at = -1;
    for (const a of list ?? []) {
      if (l.key === "resort" && seasonal && /\bresort\b/.test(a)) continue;
      const i = norm.indexOf(` ${a} `);
      if (i >= 0 && (at < 0 || i < at)) at = i;
    }
    return at;
  };
  const strong = LANDSCAPES.map((l) => ({ key: l.key, at: hit(l, l.aliases) })).filter(
    (x) => x.at >= 0
  );
  const found = strong.length ? strong : LANDSCAPES.map((l) => ({ key: l.key, at: hit(l, l.weak) })).filter((x) => x.at >= 0);
  const landscapes = found.sort((a, b) => a.at - b.at).slice(0, 2).map((x) => x.key);
  const activity = ACTIVITIES.find(([re]) => re.test(norm))?.[1] ?? null;
  const namedKey = Object.keys(NAMED_PLACES).find((k) => has(norm, k));
  const named = namedKey ? NAMED_PLACES[namedKey] ?? null : null;
  const destination = named ?? capturePlaceName(raw);
  return { landscapes, activity, destination, named: Boolean(named) };
}
function landscapeOf(key) {
  return LANDSCAPES.find((l) => l.key === key);
}
const PLACE_RULE = "A place she names is a practical input, never a style: it decides fabric, weight, footwear, layers and outerwear, and the look still reads as hers, never a generic outfit made from the place\u2019s name.";
function placeBlock(read) {
  const ls = read.landscapes.map(landscapeOf).filter((l) => Boolean(l));
  if (!ls.length) return "";
  const head = `THE PLACE \u2014 ${ls.map((l) => l.label).join(" and ")}${read.activity ? ` \xB7 ${read.activity}` : ""}. The place decides fabric, weight, footwear, layers and outerwear; her own style decides everything else. Dress her, in her own register, for it \u2014 never a costume of it.`;
  const lines = [head];
  for (const l of ls) {
    const pre = ls.length > 1 ? `${l.label[0]?.toUpperCase()}${l.label.slice(1)}: ` : "";
    lines.push(`${pre}consider ${l.consider}. Distinguish ${l.distinguish}.`);
    if (l.avoid) lines.push(`${pre}never ${l.avoid}.`);
  }
  return lines.join("\n");
}
const clip = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
function placeWeatherLine(i) {
  const day = clip(i.dayLabel, 40);
  const month = clip(i.month, 20);
  if (i.there) {
    const place = clip(i.there.place, 80);
    const reading2 = [clip(i.there.tempRange, 24), clip(i.there.condition, 40)].filter(Boolean).join(", ");
    if (reading2) {
      return {
        rung: "there",
        line: `She is dressing for ${place}${day ? `, ${day}` : ""}. ${i.there.seasonal ? `Typical weather there for that date: ${reading2}` : `Forecast there: ${reading2}`}. Dress her for exactly this weather and place, not for where she is now.`
      };
    }
  }
  const named = i.there?.place ?? (i.read.named ? i.read.destination : null);
  if (named) {
    return {
      rung: "season",
      line: `She is dressing for ${clip(named, 80)}${month ? ` in ${month}` : ""}${day ? ` (${day})` : ""}. Dress her for its climate then, not for where she is now.`
    };
  }
  const reading = [i.home.city, month].filter(Boolean).join(" \xB7 ");
  const wx = `${i.home.tempRange ? ` | ${clip(i.home.tempRange, 24)}` : ""}${i.home.condition ? ` | ${clip(i.home.condition, 40)}` : ""}`;
  const hasHome = Boolean(i.home.city || i.home.tempRange);
  if (i.read.landscapes.length) {
    const lead = day ? `She is dressing for ${day}. ` : "";
    return {
      rung: "home",
      line: hasHome ? `${lead}Where she is now: ${reading}${wx}. Her words put the look somewhere else; read this only as a guide to the season.` : day ? `${lead}Dress for the season and the place she names.` : ""
    };
  }
  if (hasHome) {
    return {
      rung: "today",
      line: `${day ? `She is dressing for ${day}. Forecast for that day` : "Real-time context"}: ${reading}${wx}. Dress the user for exactly this weather and place.`
    };
  }
  return {
    rung: "today",
    line: day ? `She is dressing for ${day}${month ? ` (${month})` : ""}. No forecast reaches that far \u2014 dress for the season and the place.` : ""
  };
}
const AREA_CODES = /^(PCL|ADM|RGN|AREA|ISL|MT|PK|LK|RES|PRK|TERR|CONT|VAL|DSRT|BCH|CST|PEN|BAY)/;
function acceptableHit(h) {
  const code = h.featureCode.toUpperCase();
  if (code === "PPLX" || code === "PPLH" || code === "PPLQ") return false;
  if (code.startsWith("PPL")) {
    if (code === "PPLC" || code === "PPLA" || code === "PPLA2") return true;
    return (h.population ?? 0) >= 1e4;
  }
  return AREA_CODES.test(code);
}
function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(s)));
}
function geocodeQuery(place) {
  return place.replace(/^the\s+/i, "").trim().slice(0, 60);
}
const HOME_RADIUS_KM = 60;
function pickDestination(hits, wrote, home) {
  const want = normalisePlaceText(geocodeQuery(wrote)).trim();
  const same = (name) => {
    const n = normalisePlaceText(name).trim();
    return n === want || n.startsWith(`${want} `) || want.startsWith(`${n} `);
  };
  const hit = hits.find((h) => acceptableHit(h) && same(h.name));
  if (!hit) return null;
  if (home && distanceKm(home, hit) < HOME_RADIUS_KM) return null;
  return hit;
}
export {
  HOME_RADIUS_KM,
  LANDSCAPES,
  NAMED_PLACES,
  PLACE_RULE,
  acceptableHit,
  capturePlaceName,
  distanceKm,
  geocodeQuery,
  landscapeOf,
  normalisePlaceText,
  pickDestination,
  placeBlock,
  placeWeatherLine,
  readPlace
};
