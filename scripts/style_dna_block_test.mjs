// The prompt block's brief slice (docs/style-memory-brief.md, slice A):
// the brief renders FIRST, its colours reach the override slots, and an
// empty brief renders nothing. `node scripts/style_dna_block_test.mjs`.
import { styleDnaPromptBlock, briefList, briefIsEmpty } from '../style_dna.js';

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
  user_overrides: { rejected_colors: ['neon'] },
};
const out = styleDnaPromptBlock(dnaFull, 6, ['The Row']);
ok(out.indexOf('HER STYLE BRIEF') === 0, 'the brief is the first line of the block');
ok(out.indexOf('HER STYLE BRIEF') < out.indexOf('STYLE TYPE') && out.indexOf('STYLE TYPE') < out.indexOf('STYLE ICONS'), 'brief → type → icons → DNA, in that order');
ok(/Works: A defined waist · An open neckline\./.test(out), 'loves render as one Works line, blanks dropped');
ok(/Never: Anything that reads polite\./.test(out), 'avoids render as Never');
ok(/Rules: No more button-ups — six is plenty\./.test(out), 'rules render as Rules');
ok(/In her words: I dress well/.test(out), 'the notes paragraph rides in');
ok(/outrank every rule below/.test(out) && /never suggest a piece she would have to find that a rule excludes/.test(out), 'the block says it outranks the rest and governs proposals');
ok(/confirmed these colours work on them[^\n]*burgundy/.test(out) && !/burgundy, Burgundy/.test(out), 'brief colours reach the loved override, deduped');
ok(/personally rejected these colours[^\n]*neon, camel/.test(out), 'the brief’s rejected colours merge after the standing user_overrides');
ok(/mature digital closet|building their digital closet/.test(out), 'the closet directive still closes the block');

const noDna = styleDnaPromptBlock({ brief }, 0, []);
ok(noDna.indexOf('HER STYLE BRIEF') === 0 && /rejected these colours[^\n]*camel/.test(noDna) && !/STYLE DNA/.test(noDna), 'a brief with no DNA and no icons still renders, colours included, no DNA header');

ok(styleDnaPromptBlock({ brief: { loves: [], avoids: [], notes: '   ' } }, 0, []) === '', 'an empty brief on an empty profile renders nothing');
ok(!/HER STYLE BRIEF/.test(styleDnaPromptBlock({ brief: { loves: [] }, style_archetypes: ['Minimal'] }, 0, [])), 'an empty brief beside a style type renders no brief block');
ok(briefIsEmpty(null) && briefIsEmpty({}) && !briefIsEmpty({ rules: ['x'] }), 'briefIsEmpty reads every list');
ok(briefList(Array.from({ length: 12 }, (_, i) => 'line ' + i)).length === 8, 'lists cap at eight lines');
ok(briefList(['a'.repeat(400)])[0].length === 160, 'a line caps at 160 characters');
const legacy = styleDnaPromptBlock({ color_harmony: dnaFull.color_harmony }, 3, []);
ok(/STYLE DNA/.test(legacy) && !/HER STYLE BRIEF/.test(legacy), 'a profile with no brief key is byte-for-byte the old block shape');

console.log(`\n\x1b[1m${passes} passed, ${fails} failed\x1b[0m`);
process.exit(fails ? 1 : 0);
