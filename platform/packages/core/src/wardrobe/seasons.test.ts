import { describe, expect, it } from 'vitest';
import { normaliseSeasons, seasonBandOf, seasonsOfBand } from './index';

describe('seasons and the band they derive', () => {
  it('reads spring or summer alone as the spring/summer band, autumn or winter alone as the other', () => {
    expect(seasonBandOf(['spring'])).toBe('spring_summer');
    expect(seasonBandOf(['spring', 'summer'])).toBe('spring_summer');
    expect(seasonBandOf(['winter'])).toBe('autumn_winter');
    expect(seasonBandOf(['autumn', 'winter'])).toBe('autumn_winter');
  });

  it('reads a mix, or nothing, as year round', () => {
    expect(seasonBandOf([])).toBe('year_round');
    expect(seasonBandOf(['summer', 'autumn'])).toBe('year_round');
    expect(seasonBandOf(['spring', 'summer', 'autumn', 'winter'])).toBe('year_round');
  });

  it('spells a band as its seasons, and round-trips', () => {
    expect(seasonsOfBand('spring_summer')).toEqual(['spring', 'summer']);
    expect(seasonsOfBand('autumn_winter')).toEqual(['autumn', 'winter']);
    expect(seasonsOfBand('year_round')).toEqual([]);
    for (const band of ['spring_summer', 'autumn_winter', 'year_round'] as const) {
      expect(seasonBandOf(seasonsOfBand(band))).toBe(band);
    }
  });

  it('spells seasons once each, in the order of the year', () => {
    expect(normaliseSeasons(['winter', 'spring', 'winter', 'mud'])).toEqual(['spring', 'winter']);
  });
});
