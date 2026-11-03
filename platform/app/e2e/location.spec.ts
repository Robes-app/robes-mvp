import http from 'node:http';
import { expect, test } from '@playwright/test';
import { E2E_GEOCODE_PORT } from './env';
import { isolateClientIp, signIn } from './helpers';

// Her device location becomes her home for the weather (POST /me/location). The e2e server's
// geocoder is this stand-in (REVERSE_GEOCODE_URL); nothing here reaches Nominatim.
interface Seen {
  url: URL;
  userAgent: string | undefined;
}
const seen: Seen[] = [];
let server: http.Server;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://fake');
    seen.push({ url, userAgent: req.headers['user-agent'] });
    // A point in the sea has no name; the geocoder is down for it.
    if (url.searchParams.get('lat') === '0') {
      res.writeHead(503).end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ address: { city: 'Fixture City', country: 'Ireland' } }));
  });
  await new Promise<void>((r) => server.listen(E2E_GEOCODE_PORT, '127.0.0.1', r));
});
test.afterAll(() => {
  server.closeAllConnections();
  server.close();
});
test.beforeEach(async ({ context }) => {
  seen.length = 0;
  await isolateClientIp(context);
});

test('the route keeps ~1 km of where she is, names it, and holds to its limit', async ({
  page,
  playwright,
  baseURL,
}) => {
  const anon = await playwright.request.newContext({ baseURL });
  expect(
    (await anon.post('/api/v1/me/location', { data: { lat: 53.35, lon: -6.26 } })).status(),
  ).toBe(401);
  await anon.dispose();

  await signIn(page);
  const api = page.request;
  for (const data of [{ lat: 91, lon: 0 }, { lat: 0, lon: 181 }, { lat: '53', lon: 0 }, {}]) {
    expect((await api.post('/api/v1/me/location', { data })).status()).toBe(400);
  }

  const sent = await api.post('/api/v1/me/location', {
    data: { lat: 53.349_812, lon: -6.260_31 },
  });
  expect(sent.status()).toBe(200);
  expect(await sent.json()).toEqual({ ok: true });
  expect((await (await api.get('/api/v1/me')).json()).homeCity).toBe('Fixture City');
  const asked = seen.at(-1);
  expect(asked?.url.searchParams.get('lat')).toBe('53.35');
  expect(asked?.url.searchParams.get('lon')).toBe('-6.26');
  expect(asked?.userAgent).toMatch(/^Robes\//);
  expect([...(asked?.url.searchParams.keys() ?? [])].sort()).toEqual(
    ['accept-language', 'addressdetails', 'format', 'lat', 'lon', 'zoom'].sort(),
  );

  // No name for the place: the coordinates still save and her city stays.
  expect((await api.post('/api/v1/me/location', { data: { lat: 0, lon: 0 } })).status()).toBe(200);
  expect((await (await api.get('/api/v1/me')).json()).homeCity).toBe('Fixture City');

  // A city she types replaces the device location.
  const typed = await api.patch('/api/v1/me', { data: { homeCity: 'Galway' } });
  expect((await typed.json()).homeCity).toBe('Galway');

  // Ten an hour per user, counted before validation: six are spent above.
  const statuses: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    statuses.push(
      (await api.post('/api/v1/me/location', { data: { lat: 53.27, lon: -9.05 } })).status(),
    );
  }
  expect(statuses).toEqual([200, 200, 200, 200, 429]);
});

test('allowed on her first visit, the weather follows her device', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 51.507_35, longitude: -0.127_75 },
  });
  await isolateClientIp(context);
  const page = await context.newPage();
  // Keep the forecast offline: home asks for the weather once the location lands.
  await page.route('**/api/v1/today/weather*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }),
  );
  await signIn(page);
  await expect
    .poll(async () => (await (await page.request.get('/api/v1/me')).json()).homeCity)
    .toBe('Fixture City');
  expect(seen.at(-1)?.url.searchParams.get('lat')).toBe('51.51');
  expect(await page.evaluate(() => ({ ...window.localStorage }))).toMatchObject({
    'robes.geo.asked': '1',
    'robes.geo.ok': '1',
  });

  // A later session within a few hours sends nothing more.
  const before = seen.length;
  await page.goto('/wardrobe');
  await page.waitForLoadState('networkidle');
  expect(seen.length).toBe(before);
  await context.close();
});

test('declined, she is never asked again', async ({ browser }) => {
  const context = await browser.newContext();
  await isolateClientIp(context);
  // Count every read of the position (each would be a prompt while undecided).
  await context.addInitScript(() => {
    const w = window as unknown as { __geoReads: number };
    w.__geoReads = 0;
    const geo = navigator.geolocation;
    const read = geo.getCurrentPosition.bind(geo);
    geo.getCurrentPosition = (ok, fail, opts) => {
      w.__geoReads += 1;
      read(ok, fail, opts);
    };
  });
  const page = await context.newPage();
  await signIn(page);
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => window.localStorage.getItem('robes.geo.ok'))).toBeNull();

  await page.goto('/wardrobe');
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => (window as unknown as { __geoReads: number }).__geoReads)).toBe(
    0,
  );
  expect(seen).toEqual([]);
  expect((await (await page.request.get('/api/v1/me')).json()).homeCity).toBeNull();
  await context.close();
});
