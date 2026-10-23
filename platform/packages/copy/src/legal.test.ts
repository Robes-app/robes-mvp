import { describe, expect, it } from 'vitest';
import { shell } from './index';
import { legal } from './legal';

describe('legal docs', () => {
  it('carries the date the text was last updated', () => {
    expect(legal.lastUpdated).toContain('23 October 2026');
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
    for (const gone of ['Resend', 'Airtable', 'Anthropic', 'Passwords are never'])
      expect(privacy).not.toContain(gone);
  });
});
