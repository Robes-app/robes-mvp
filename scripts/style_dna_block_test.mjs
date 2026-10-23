// The prompt block's brief slice (docs/style-memory-brief.md, slice A):
// the brief renders FIRST, its colours reach the override slots, and an
// empty brief renders nothing. `node scripts/style_dna_block_test.mjs`.
import { styleDnaPromptBlock, paletteLines, briefList, briefIsEmpty, memoryEntries, MEMORY_MAX } from '../style_dna.js';

let passes = 0, fails = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m); } };

const brief = {
  loves: ['A defined waist', { text: 'An open neckline', source: 'edited' }, '   ', null],
  avoids: [{ text: 'Anything that reads polite', source: 'drafted' }],
  rules: ['No more button-ups — six is plenty'],
  notes: 'I dress well when the structure is already there.',
  colours: { loved: ['burgundy', 'Burgundy'], rejected: ['camel'] },
};
const dnaFull = {
  brief,
  style_archetypes: ['Sculptural'],
  color_harmony: { archetype_name: 'Soft Autumn', verified_undertone: 'Neutral-Warm', calculated_contrast: 'Low', functional_sub_palettes: { avoid_list: ['fuchsia'] } },
  user_overrides: { rejected_colors: ['pink', 'neon'] },
};
const out = styleDnaPromptBlock(dnaFull, 6, ['The Row']);
ok(out.indexOf('HER HARD NOS') === 0 && /override everything beneath them: her taste, her icons, the colour and line notes/.test(out), 'her hard nos are the first block, and absolute (19 Oct)');
ok(/^Never: Anything that reads polite\.$/m.test(out) && !/Never in these colours/.test(out) && !/camel/.test(out.split('HER STYLE BRIEF')[0]), 'the Never line is the typed no alone — a colour she avoids is SOFT and never a hard no (22 Oct)');
ok(out.indexOf('HER HARD NOS') < out.indexOf('HER STYLE BRIEF') && out.indexOf('HER STYLE BRIEF') < out.indexOf('STYLE TYPE') && out.indexOf('STYLE TYPE') < out.indexOf('STYLE ICONS') && out.indexOf('STYLE ICONS') < out.indexOf('STYLE DNA'), 'hard nos → brief → type → icons → DNA, in that order');
ok(/Works: A defined waist · An open neckline\./.test(out), 'loves render as one Works line, blanks dropped');
ok(!/HER STYLE BRIEF[\s\S]*Never:/.test(out.split('STYLE TYPE')[0].split('HER STYLE BRIEF')[1] || ''), 'the brief block itself carries no Never line — the nos moved up');
ok(/Rules: No more button-ups — six is plenty\./.test(out), 'rules render as Rules');
ok(/In her words: I dress well/.test(out), 'the notes paragraph rides in');
ok(/outrank every note read from a photograph below/.test(out) && /never suggest a piece she would have to find that a rule excludes/.test(out), 'the brief outranks the photograph reads and governs proposals');
ok(/HER COLOURS — the ones she loves: burgundy\./.test(out) && !/burgundy, Burgundy/.test(out) && /outrank the colouring read/.test(out), 'the legacy loved list maps through the colour model (burgundy → the shade, once) and outranks the read');
ok(/COLOURS SHE'D RATHER NOT BUY — Pinks, camel\. Never propose a NEW piece in one/.test(out) && /A piece she already owns in one is hers to wear: style it like any other, never single it out/.test(out) && !/neon/.test(out), 'the legacy rejected lists map too (pink → the Pinks family, camel → the shade, a word the model cannot place dropped), as a soft avoid: nothing new, what she owns still styled');
ok(out.indexOf("COLOURS SHE'D RATHER NOT BUY") > out.indexOf('STYLE DNA'), 'her colours render after the photograph read, which they outrank');
ok(!/personally rejected/.test(out) && !/Never style them in/.test(out), 'no "never" survives outside the hard nos — the DNA read is guidance');
ok(/STYLE DNA — read from her photographs\. Guidance, not law/.test(out) && /Colours that tend to fight her colouring[^\n]*fuchsia/.test(out), 'the DNA header and the avoid list read as guidance');
ok(/mature digital closet|building their digital closet/.test(out), 'the closet directive still closes the block');

const noDna = styleDnaPromptBlock({ brief }, 0, []);
ok(noDna.indexOf('HER HARD NOS') === 0 && /RATHER NOT BUY — camel/.test(noDna) && /HER COLOURS[^\n]*burgundy/.test(noDna) && !/STYLE DNA/.test(noDna), 'a brief with no DNA and no icons still renders, colours included, no DNA header');
// The model proper (phase 4): a shade she set overrides its family, prints have their own two lines, an empty palette renders nothing.
const pal = { palette: { fam: { blues: 1, reds: -1 }, shade: { cobalt: -1, cherry: 1 }, print: { stripes: 1, animal: -1 } } };
const palOut = styleDnaPromptBlock(pal, 0, []);
ok(/HER COLOURS — the ones she loves: Blues \(not cobalt\), cherry\./.test(palOut) && /RATHER NOT BUY — Reds \(not cherry\), cobalt\./.test(palOut), 'a palette renders its families with their shade exceptions on both sides');
ok(/PRINTS she loves: stripes/.test(palOut) && /PRINTS she'd rather not buy: animal prints — never a new piece in one; one she owns is styled like any other\./.test(palOut), 'prints render love and soft avoid');
ok(!/HER HARD NOS/.test(palOut), 'a palette alone raises no hard-nos block');
ok(styleDnaPromptBlock({ palette: {} }, 0, []) === '' && paletteLines({ palette: { fam: { blues: 0 } } }).length === 0, 'an empty palette (or one at no view) renders nothing');
ok(paletteLines({ palette: { fam: { blues: 1 }, shade: { cobalt: 1 } } }).join('\n').indexOf('cobalt') === -1, 'a shade set the same way as its family folds into the family');
ok(styleDnaPromptBlock({ palette: { fam: { greens: 1 } }, brief: { colours: { loved: ['red'] } } }, 0, []).indexOf('Reds') === -1, 'once a palette exists the legacy lists are no longer read');

ok(styleDnaPromptBlock({ brief: { loves: [], avoids: [], notes: '   ' } }, 0, []) === '', 'an empty brief on an empty profile renders nothing');
ok(!/HER STYLE BRIEF/.test(styleDnaPromptBlock({ brief: { loves: [] }, style_archetypes: ['Minimal'] }, 0, [])), 'an empty brief beside a style type renders no brief block');
ok(briefIsEmpty(null) && briefIsEmpty({}) && !briefIsEmpty({ rules: ['x'] }), 'briefIsEmpty reads every list');
ok(briefList(Array.from({ length: 12 }, (_, i) => 'line ' + i)).length === 12, 'lists carry every line — no cap (Annie, 13 Oct)');
ok(briefList(['a'.repeat(400)])[0].length === 160, 'a line caps at 160 characters');
ok(briefList(['6', 'You do not wear combat boots', 'you do not wear combat boots.', ' ']).join('|') === 'You do not wear combat boots', 'a line with no letters is dropped and a duplicate renders once (19 Oct)');
const nosOnly = styleDnaPromptBlock({ brief: { avoids: ['Heels'] } }, 0, []);
ok(nosOnly.indexOf('HER HARD NOS') === 0 && !/HER STYLE BRIEF/.test(nosOnly), 'nos alone render the hard-nos block and no brief block');
const softened = styleDnaPromptBlock({ style_archetypes: ['Minimal'], silhouette_proportions: { body_type: 'Hourglass', architectural_rules: { dress_silhouettes: ['Wrap'], necklines: ['V'], styling_maxims: ['Always anchor at the waist.'] } } }, 20, ['Jane Birkin']);
ok(/Her taste leads: where a colour or line note below pulls against it, her taste wins/.test(softened) && /guidance to adapt an icon/.test(softened), 'style type and icons lead; colour and line are guidance');
ok(/Line read, from one photograph — a tilt, never a rule: Hourglass/.test(softened) && /Styling leanings — apply one only where it agrees with her brief/.test(softened) && !/Body architecture:/.test(softened), 'the line read and the maxims are leanings, not rules');
ok(/sit inside her brief and her taste/.test(softened) && !/obey the silhouette maxims/.test(softened), 'the closet directive no longer orders obedience to the maxims');
const legacy = styleDnaPromptBlock({ color_harmony: dnaFull.color_harmony }, 3, []);
ok(/STYLE DNA/.test(legacy) && !/HER STYLE BRIEF/.test(legacy), 'a profile with no brief key is byte-for-byte the old block shape');

// The memory (slice B): beneath the brief, above the type; a pattern, not a
// transcript.
const memory = { v: 1, entries: [
  { t: '2026-09-30T10:00:00Z', k: 'verdict', v: 0, on: 'The Thursday one', text: 'too much black' },
  { t: '2026-09-29T10:00:00Z', k: 'swap', out: 'loafers', in: 'white sandals', cat: 'Shoes' },
  { t: '2026-09-28T10:00:00Z', k: 'swap', out: 'brogues', in: 'trainers', cat: 'shoes' },
  { t: '2026-09-27T10:00:00Z', k: 'swap', out: 'block heels', in: 'sandals', cat: 'Shoes' },
  { t: '2026-09-26T10:00:00Z', k: 'swap', out: 'a wool blazer', in: 'denim jacket', cat: 'outerwear' },
  { t: '2026-09-25T10:00:00Z', k: 'wear', look: 'Office armour', pieces: 4 },
  { t: '2026-09-24T10:00:00Z', k: 'strike', text: 'You reach for black' },
  { t: '2026-09-24T09:00:00Z', k: 'ask', on: 'Harbour Dinner', surface: 'composer', text: 'not the loafers again' },
  { t: '2026-09-23T10:00:00Z', k: 'nonsense', text: 'dropped' },
] };
const mem = styleDnaPromptBlock({ brief, memory, style_archetypes: ['Sculptural'] }, 6, []);
ok(mem.indexOf('HER HARD NOS') === 0 && mem.indexOf('HER STYLE BRIEF') < mem.indexOf('WHAT SHE HAS TOLD ROBES RECENTLY') && mem.indexOf('WHAT SHE HAS TOLD ROBES RECENTLY') < mem.indexOf('STYLE TYPE'), 'memory renders after the nos and the brief, before the style type');
ok(/Not quite — The Thursday one: "too much black"/.test(mem), 'a verdict carries what it was about and her words');
ok(!/Struck from her brief/.test(mem) && !/You reach for black/.test(mem), 'a struck observation never reaches the prompt — her call is final (19 Oct)');
const dup = styleDnaPromptBlock({ memory: { entries: [{ k: 'ask', on: 'Cinema', text: 'Button up the jacket' }, { k: 'ask', on: 'Cinema', text: 'Button up the jacket' }] } }, 0, []);
ok(dup.split('\n').filter(l => /Button up the jacket/.test(l)).length === 1, 'the same ask twice is one line');
ok(/Asked — Harbour Dinner: "not the loafers again"/.test(mem), 'a line sent to the look prompt reads as what she asked of the look');
ok(/Has swapped out shoes three times/.test(mem) && !/Swapped out loafers/.test(mem), 'three swaps of one category fold into one pattern line, the three events gone');
ok(/Swapped out a wool blazer for her denim jacket \(outerwear\)/.test(mem), 'a lone swap names out, in and category');
ok(/Wore "Office armour" \(4 pieces\)/.test(mem), 'a wear names the look she reaches for');
ok(/not proposed again unless she names it/.test(mem), 'the closing rule stands');
ok(!/dropped/.test(mem), 'an unknown kind never reaches the prompt');
ok(styleDnaPromptBlock({ memory: { entries: [] } }, 0, []) === '' && styleDnaPromptBlock({ memory: null }, 0, []) === '', 'an empty memory renders nothing');
const memOnly = styleDnaPromptBlock({ memory: { entries: [{ k: 'verdict', v: 1, on: 'Sunday lunch' }] } }, 0, []);
ok(/Loved — Sunday lunch\./.test(memOnly) && !/STYLE DNA/.test(memOnly), 'a memory alone renders, no DNA header');
const many = { entries: Array.from({ length: 40 }, (_, i) => ({ k: 'verdict', v: 1, on: 'look ' + i })) };
ok(styleDnaPromptBlock({ memory: many }, 0, []).split('\n').length === 14, 'the memory never exceeds twelve lines plus its two frames');
ok(memoryEntries(Array.from({ length: 80 }, () => ({ k: 'wear', look: 'x' }))).length === MEMORY_MAX, 'memoryEntries caps at MEMORY_MAX');

// The Style DNA page (Settings, 2026-10-07): brands, the investment level,
// the facts and a tag per icon ride the same block.
const dnaPage = styleDnaPromptBlock({ brands: ['The Row', 'Zara', '  ', 7], investment: '€500–1,500', facts: { height_cm: 168, size_uk: 10, shoe_uk: 5, age_band: '45–54' }, icon_tags: { 'Hailey Bieber': 'Clean-girl minimal' } }, 0, ['Hailey Bieber', 'Jane Birkin']);
ok(/BRANDS she reaches for: The Row, Zara\./.test(dnaPage), 'brands render as one line, blanks and non-strings dropped');
ok(/INVESTMENT LEVEL — she spends €500–1,500 a year/.test(dnaPage) && /never a piece above what that level buys/.test(dnaPage), 'the investment level is the ceiling on every proposal');
ok(/THE FACTS she gave — size, never weight: height 168 cm, dress size UK 10 \(EU 38\), shoes UK 5, age 45–54\./.test(dnaPage), 'the facts print with the EU size derived, never a weight');
ok(/STYLE ICONS[^\n]*Hailey Bieber \(Clean-girl minimal\), Jane Birkin\./.test(dnaPage), 'an icon carries its tag, an untagged one its name alone');
ok(dnaPage.indexOf('STYLE ICONS') < dnaPage.indexOf('BRANDS') && dnaPage.indexOf('BRANDS') < dnaPage.indexOf('INVESTMENT') && dnaPage.indexOf('INVESTMENT') < dnaPage.indexOf('THE FACTS'), 'icons → brands → investment → facts, in that order');

// The investment-vs-memory line (cut C, 2026-10-09): the client's spend read
// rides `dna.spend`; only "above" earns a line, under the level, before the facts.
const above = styleDnaPromptBlock({ investment: '€500–1,500', facts: { size_uk: 10 }, spend: { n: 4, total: 2140, median: 390, verdict: 'above' } }, 0, []);
ok(/WHAT SHE ACTUALLY BUYS — the 4 priced pieces she filed this year come to €2,140, a typical one €390: above the level she set\./.test(above), 'she buys above her level: the count, the total, the typical piece');
ok(/never raise the ceiling to match her receipts/.test(above) && /never as a cheaper copy of them/.test(above), 'the level still rules; her prices read as taste');
ok(above.indexOf('INVESTMENT LEVEL') < above.indexOf('WHAT SHE ACTUALLY BUYS') && above.indexOf('WHAT SHE ACTUALLY BUYS') < above.indexOf('THE FACTS'), 'the line sits under the level, before the facts');
ok(!/WHAT SHE ACTUALLY BUYS/.test(styleDnaPromptBlock({ investment: '€500–1,500', spend: { n: 4, total: 900, median: 200, verdict: 'inside' } }, 0, [])), 'inside the level renders no line');
ok(!/WHAT SHE ACTUALLY BUYS/.test(styleDnaPromptBlock({ investment: '€500–1,500', spend: { n: 2, total: 2000, median: 1000, verdict: 'above' } }, 0, [])), 'fewer than three priced pieces renders no line');
ok(!/WHAT SHE ACTUALLY BUYS/.test(styleDnaPromptBlock({ brands: ['Zara'], spend: { n: 4, total: 2140, median: 390, verdict: 'above' } }, 0, [])), 'no level set, no line — there is nothing to be above');
ok(!/STYLE DNA/.test(dnaPage), 'no DNA header without a photograph read');
ok(styleDnaPromptBlock({ facts: { height_cm: 'tall', size_uk: 99 } }, 0, []) === '', 'facts out of range render nothing');
ok(/dress size UK 12 \(EU 40\)/.test(styleDnaPromptBlock({ facts: { size_uk: 12 } }, 0, [])), 'a lone fact still renders');
// bust and waist (the digital twin, 2026-10-20): a bra size as given, else the tape; a measurement, never a weight
ok(/height 168 cm, dress size UK 10 \(EU 38\), bust 34C, waist 71 cm, shoes UK 5/.test(styleDnaPromptBlock({ facts: { height_cm: 168, size_uk: 10, bust_band: 34, bust_cup: 'C', waist_cm: 71, shoe_uk: 5 } }, 0, [])), 'bust as a bra size and the waist in cm ride THE FACTS, between the size and the shoes');
ok(/bust 89 cm, waist 74 cm/.test(styleDnaPromptBlock({ facts: { bust_cm: 89, waist_cm: 74 } }, 0, [])) && !/bust 3/.test(styleDnaPromptBlock({ facts: { bust_cm: 89, bust_band: 34 } }, 0, [])), 'the tape prints when no cup is given; a band without a cup prints nothing');
ok(!/weight/i.test(styleDnaPromptBlock({ facts: { bust_cm: 89, waist_cm: 74, weight: 60 } }, 0, [])) || /never weight/.test(styleDnaPromptBlock({ facts: { bust_cm: 89, waist_cm: 74, weight: 60 } }, 0, [])), 'a weight on the facts never prints');
ok(/THE FACTS/.test(styleDnaPromptBlock({ facts: { size_uk: 12 }, color_harmony: dnaFull.color_harmony }, 3, [])), 'the facts ride beside a photograph read too');

// Where the pieces come from (2026-10-19): her answer in the box turns the
// count-derived SYSTEM DIRECTIVE into a deferral to that answer.
const balanced = styleDnaPromptBlock({ color_harmony: dnaFull.color_harmony }, 6, [], { balance: 'owned' });
ok(/SYSTEM DIRECTIVE: She has said where the pieces of this look should come from/.test(balanced) && !/building their digital closet/.test(balanced), 'a balance answer replaces the count-derived directive');
ok(/building their digital closet \(6\/15 items\)/.test(styleDnaPromptBlock({ color_harmony: dnaFull.color_harmony }, 6, [])), 'no answer keeps the count-derived directive');

console.log(`\n\x1b[1m${passes} passed, ${fails} failed\x1b[0m`);
process.exit(fails ? 1 : 0);
