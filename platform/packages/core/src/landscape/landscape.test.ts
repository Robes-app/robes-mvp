import { describe, expect, it } from 'vitest';
import {
  acceptableHit,
  capturePlaceName,
  type GeoHit,
  geocodeQuery,
  LANDSCAPES,
  PLACE_RULE,
  pickDestination,
  placeBlock,
  placeWeatherLine,
  readPlace,
} from './index';

describe('readPlace — Liberty’s client language', () => {
  it('reads one landscape from her words', () => {
    expect(readPlace('a weekend by the sea').landscapes).toEqual(['coast']);
    expect(readPlace('Ski trip next week').landscapes).toEqual(['mountains']);
    expect(readPlace('a muddy dog walk on Sunday').landscapes).toEqual(['country']);
    expect(readPlace('lunch at a lake house').landscapes).toEqual(['lakeside']);
  });

  it('lets two landscapes coexist, in the order she wrote them (her rule 6)', () => {
    expect(readPlace('a city by the sea').landscapes).toEqual(['city', 'coast']);
    expect(readPlace('a weekend in the Cotswolds').landscapes).toEqual(['country', 'village']);
    expect(readPlace('après-ski drinks').landscapes).toEqual(['mountains', 'resort']);
  });

  it('reads a weak phrase only when nothing stronger names the place', () => {
    expect(readPlace('drinks in town').landscapes).toEqual(['city']);
    expect(readPlace('a market town on Saturday').landscapes).toEqual(['village']);
    expect(readPlace('on holiday at the beach').landscapes).toEqual(['coast']);
  });

  it('names no landscape for "a weekend away" or an ordinary day', () => {
    expect(readPlace('a weekend away').landscapes).toEqual([]);
    expect(readPlace('a casual Thursday').landscapes).toEqual([]);
    expect(readPlace('client meeting then dinner').landscapes).toEqual([]);
    expect(readPlace('').landscapes).toEqual([]);
  });

  it('reads "resort" as the fashion season beside collection, season or a year', () => {
    expect(readPlace('something from the resort collection').landscapes).toEqual([]);
    expect(readPlace('resort 27 pieces').landscapes).toEqual([]);
    expect(readPlace('dinner at the resort').landscapes).toEqual(['resort']);
  });

  it('reads what she is doing there', () => {
    expect(readPlace('a coastal walk').activity).toBe('walking');
    expect(readPlace('lunch by the sea').activity).toBe('lunch');
    expect(readPlace('skiing in the Alps').activity).toBe('skiing');
    expect(readPlace('by the sea').activity).toBeNull();
  });
});

describe('the destination — a place she wrote, never inferred', () => {
  it('takes Liberty’s named places in any case', () => {
    expect(readPlace('a weekend in the cotswolds')).toMatchObject({
      destination: 'the Cotswolds',
      named: true,
    });
    expect(readPlace('marrakech in december').destination).toBe('Marrakech');
  });

  it('captures a capitalised name after in / to / around', () => {
    expect(capturePlaceName('A weekend in Lisbon')).toBe('Lisbon');
    expect(capturePlaceName('flying to New York on Friday')).toBe('New York');
    expect(capturePlaceName('Dinner in Palma de Mallorca')).toBe('Palma de Mallorca');
    expect(readPlace('A weekend in Lisbon')).toMatchObject({ destination: 'Lisbon', named: false });
  });

  it('never takes a day, a month or a restaurant after "at"', () => {
    expect(capturePlaceName('dinner on Friday in March')).toBeNull();
    expect(capturePlaceName('drinks at Sketch')).toBeNull();
    expect(capturePlaceName('somewhere warm')).toBeNull();
    expect(readPlace('a casual Thursday').destination).toBeNull();
  });

  it('asks the geocoder without the article', () => {
    expect(geocodeQuery('the Cotswolds')).toBe('Cotswolds');
    expect(geocodeQuery('Lisbon')).toBe('Lisbon');
  });
});

describe('pickDestination', () => {
  const hit = (o: Partial<GeoHit>): GeoHit => ({
    name: 'Lisbon',
    country: 'Portugal',
    lat: 38.72,
    lon: -9.14,
    featureCode: 'PPLC',
    population: 500_000,
    ...o,
  });
  const london = { lat: 51.51, lon: -0.13 };

  it('accepts a real place far from home', () => {
    expect(pickDestination([hit({})], 'Lisbon', london)?.name).toBe('Lisbon');
  });

  it('refuses a place near home — its weather is hers already', () => {
    expect(
      pickDestination([hit({ name: 'Soho', lat: 51.51, lon: -0.13 })], 'Soho', london),
    ).toBeNull();
  });

  it('refuses a neighbourhood, a hamlet, or a different name', () => {
    expect(acceptableHit(hit({ featureCode: 'PPLX' }))).toBe(false);
    expect(acceptableHit(hit({ featureCode: 'PPL', population: 300 }))).toBe(false);
    expect(acceptableHit(hit({ featureCode: 'MTS', population: null }))).toBe(true);
    expect(pickDestination([hit({ name: 'Townsville' })], 'Town', null)).toBeNull();
  });
});

describe('placeWeatherLine — the weather follows the place she names', () => {
  const home = { city: 'London', tempRange: '8–13°C', condition: 'rain' };
  const base = { dayLabel: null, month: 'October', home };

  it('dresses for the forecast there, never her home city', () => {
    const r = placeWeatherLine({
      ...base,
      dayLabel: 'Saturday 31 October',
      read: readPlace('a weekend in Lisbon'),
      there: {
        place: 'Lisbon, Portugal',
        tempRange: '15–21°C',
        condition: 'clear',
        seasonal: false,
      },
    });
    expect(r.rung).toBe('there');
    expect(r.line).toContain('She is dressing for Lisbon, Portugal, Saturday 31 October.');
    expect(r.line).toContain('Forecast there: 15–21°C, clear');
    expect(r.line).not.toContain('London');
  });

  it('says a reading for the date is typical, not a forecast', () => {
    const r = placeWeatherLine({
      ...base,
      read: readPlace('Christmas in Lisbon'),
      there: { place: 'Lisbon, Portugal', tempRange: '9–15°C', condition: 'rain', seasonal: true },
    });
    expect(r.line).toContain('Typical weather there for that date: 9–15°C, rain');
  });

  it('dresses for the climate of a named place it cannot read', () => {
    const r = placeWeatherLine({ ...base, read: readPlace('the Caribbean'), there: null });
    expect(r.rung).toBe('season');
    expect(r.line).toBe(
      'She is dressing for the Caribbean in October. Dress her for its climate then, not for where she is now.',
    );
  });

  it('keeps her home reading only as a guide when the place has no name', () => {
    const r = placeWeatherLine({ ...base, read: readPlace('a weekend by the sea'), there: null });
    expect(r.rung).toBe('home');
    expect(r.line).toContain('Where she is now: London · October | 8–13°C | rain.');
    expect(r.line).toContain('read this only as a guide to the season');
  });

  it('leaves an ordinary day exactly as before', () => {
    const r = placeWeatherLine({ ...base, read: readPlace('a casual Thursday'), there: null });
    expect(r.rung).toBe('today');
    expect(r.line).toBe(
      'Real-time context: London · October | 8–13°C | rain. Dress the user for exactly this weather and place.',
    );
  });

  it('a capitalised word the geocoder could not confirm is not a place', () => {
    const r = placeWeatherLine({ ...base, read: readPlace('drinks in Soho'), there: null });
    expect(r.rung).toBe('today');
  });
});

describe('placeBlock', () => {
  it('renders only when a landscape matched, from the vocabulary alone', () => {
    expect(placeBlock(readPlace('a casual Thursday'))).toBe('');
    const b = placeBlock(readPlace('a coastal walk'));
    expect(b).toContain('THE PLACE — the coast · walking.');
    expect(b).toContain('never a costume of it');
    expect(b).toContain('consider wind, sun, salt air');
    expect(b).toContain('Distinguish a British seaside town');
  });

  it('carries Liberty’s avoid line where she wrote one', () => {
    expect(placeBlock(readPlace('a country weekend'))).toContain(
      'never traditional or heritage country clothing by default',
    );
  });

  it('names each landscape when two coexist', () => {
    const b = placeBlock(readPlace('a city by the sea'));
    expect(b).toContain('THE PLACE — the city and the coast.');
    expect(b).toContain('The city: consider');
    expect(b).toContain('The coast: consider');
  });

  it('never carries a visual field: a landscape is not a style', () => {
    for (const l of LANDSCAPES) expect(Object.keys(l)).not.toContain('visual');
    expect(PLACE_RULE).toContain('never a style');
  });
});
