import {test, expect, type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import process from 'node:process';

// Accessibility and console sweep over every screen of the seeded demo network, signed out,
// as the demo student and as the demo moderator, at desktop and phone widths. Read-only.
const app = process.env.E2E_APP_URL || 'http://127.0.0.1:8080';
if (!['127.0.0.1', 'localhost', 'skillshare-app'].includes(new URL(app).hostname)) throw new Error('The sweep only runs against a local demo stack');
const publicRoutes = ['/', '/login', '/guidelines', '/privacy', '/terms', '/no-such-page'];
const memberRoutes = ['/home', '/discover', '/discover?tab=swaps', '/discover?tab=saved', '/requests', '/requests?tab=active', '/requests?tab=past', '/me', '/me/edit', '/settings', '/analytics'];

async function sweep(page: Page, route: string, problems: string[]) {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('status').filter({hasText: /…|\.\.\.|Loading|Finding/})).toHaveCount(0);
  const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  for (const violation of results.violations) problems.push(`${route}: ${violation.id} at ${violation.nodes.map(n => n.target.join(' ')).join(', ')}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push(`${route}: horizontal overflow`);
}

for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
  test(`every screen passes axe and logs no errors at ${viewport.width}px`, async ({browser}) => {
    const problems: string[] = [];
    const context = await browser.newContext({viewport, baseURL: app});
    const page = await context.newPage();
    // Chrome reports the COOP header as ignored on plain-HTTP hostnames other than localhost, which is
    // how the test container reaches the app; browsers on localhost or HTTPS honor it.
    const ignored = /Cross-Origin-Opener-Policy header has been ignored/;
    page.on('console', message => { if (message.type() === 'error' && !ignored.test(message.text())) problems.push(`console: ${message.text()} (${page.url()})`); });
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/no-such-page')) problems.push(`HTTP ${response.status()}: ${response.url()}`); });
    for (const route of publicRoutes) await sweep(page, route, problems);
    await page.goto('/login');
    await page.getByRole('button', {name: 'Try the demo as a sample student'}).click();
    await expect(page).toHaveURL(/\/home$/);
    const profileLink = await (async () => { await page.goto('/discover?tab=swaps'); return page.getByRole('link', {name: /^See swap with/}).first().getAttribute('href'); })();
    const requestLink = await (async () => { await page.goto('/requests'); return page.locator('a[href^="/requests/"]').first().getAttribute('href'); })();
    for (const route of [...memberRoutes, profileLink!, requestLink!]) await sweep(page, route, problems);
    await page.goto('/settings');
    await page.getByRole('button', {name: 'Sign out'}).filter({visible: true}).first().click();
    await page.getByRole('button', {name: 'Or view the demo moderator screens'}).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await sweep(page, '/analytics', problems);
    await context.close();
    expect(problems).toEqual([]);
  });
}
