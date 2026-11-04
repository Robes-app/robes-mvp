import { describe, expect, it } from 'vitest';
import { shell } from './index';
import { legal } from './legal';

describe('legal docs', () => {
  it('carries the date the text was last updated', () => {
    expect(legal.lastUpdated).toContain('4 November 2026');
  });

  it.each(Object.entries(legal.docs))('%s has real sections, not the placeholder', (_, doc) => {
    expect(doc.title).not.toBe('');
    expect(doc.sections.length).toBeGreaterThan(2);
    for (const s of doc.sections) {
      expect(s.heading).not.toBe('');
      expect(s.body.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify(doc)).not.toContain(shell.soon.title);
  });

  it('names the platform’s processors, not the legacy ones', () => {
    const privacy = JSON.stringify(legal.docs.privacy);
    for (const name of ['Amazon SES', 'Vercel', 'Supabase', 'Google Gemini', 'PostHog'])
      expect(privacy).toContain(name);
    for (const gone of [
      'Resend',
      'Airtable',
      'Anthropic',
      'Passwords are never',
      'full-length photograph',
    ])
      expect(privacy).not.toContain(gone);
  });

  it('names the controller, the age and the governing law', () => {
    const { terms, privacy } = legal.docs;
    for (const doc of [terms, privacy])
      expect(JSON.stringify(doc)).toContain('Robes Technologies Limited');
    const t = JSON.stringify(terms);
    expect(t).toContain('18 or over');
    expect(t).toContain('laws of Ireland');
    expect(t).toContain('Your likeness, your terms');
  });

  it('states retention, the legal basis, transfers and the regulator', () => {
    const privacy = JSON.stringify(legal.docs.privacy);
    for (const heading of [
      'Your location',
      'How long we keep it',
      'The legal basis',
      'Your rights',
    ])
      expect(privacy).toContain(heading);
    expect(privacy).toContain('Standard Contractual Clauses');
    expect(privacy).toContain('Data Protection Commission');
  });

  it('carries no beta wording and no under-18 age', () => {
    for (const doc of Object.values(legal.docs)) {
      const text = JSON.stringify(doc);
      expect(text).not.toMatch(/\bbeta\b/i);
      expect(text).not.toContain('at least 16');
    }
  });
});
