import { expect, test } from '@playwright/test';
import { isolateClientIp, signIn } from './helpers';

test.beforeEach(({ context }) => isolateClientIp(context));

test('a fake job streams its stages to the page without polling', async ({ page }) => {
  await signIn(page);

  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  const statusReads: string[] = [];
  const streams: string[] = [];
  page.on('request', (req) => {
    const path = new URL(req.url()).pathname;
    if (/^\/api\/v1\/jobs\/[^/]+$/.test(path) && req.method() === 'GET') statusReads.push(path);
    if (/^\/api\/v1\/jobs\/[^/]+\/events$/.test(path)) streams.push(path);
  });

  await page.goto('/dev/jobs');
  await page.getByRole('button', { name: 'Start a fake job' }).click();

  await expect(page.getByRole('heading', { name: 'A test look, three ways.' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Done.');
  await expect(page.getByRole('list', { name: 'Images' }).getByRole('listitem')).toHaveCount(3);
  expect(page.url()).toMatch(/\?job=[0-9a-f-]{36}$/);

  expect(statusReads).toEqual([]);
  expect(streams).toHaveLength(1);
  expect(violations).toEqual([]);

  // A refresh resumes from the stored row.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A test look, three ways.' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Done.');
});

test('the job stream is private to its owner', async ({ page, browser }) => {
  await signIn(page);
  await page.goto('/dev/jobs');
  await page.getByRole('button', { name: 'Start a fake job' }).click();
  await expect(page).toHaveURL(/\?job=/);
  const jobId = new URL(page.url()).searchParams.get('job');

  const stranger = await browser.newContext();
  await isolateClientIp(stranger);
  const other = await stranger.newPage();
  await signIn(other, undefined, 'Bo');
  expect((await other.request.get(`/api/v1/jobs/${jobId}`)).status()).toBe(404);
  expect((await other.request.get(`/api/v1/jobs/${jobId}/events`)).status()).toBe(404);
  await stranger.close();
});
