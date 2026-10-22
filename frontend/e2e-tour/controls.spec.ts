import {test, expect, type Page} from '@playwright/test';
import process from 'node:process';

// Opens every internal link and presses every non-destructive control on each screen of the demo
// network, recording dead links, unnamed controls, console errors and failed requests. Read-only:
// buttons that send, save, accept, block, report, delete or sign out are only checked, never pressed.
const app = process.env.E2E_APP_URL || 'http://127.0.0.1:8080';
if (!['127.0.0.1', 'localhost', 'skillshare-app'].includes(new URL(app).hostname)) throw new Error('The controls sweep only runs against a local demo stack');
const UNSAFE = /delete|sign out|block|report|decline|accept|cancel|mark (complete|done)|submit|send|save|go live|remove|unsave|withdraw|copy|text a friend|export|try the demo|moderator|verify|resend|use another email|propose|ask for help|read|mark all|status|open to|not available|invisible|unblock|upload|retry|try again/i;
const ignoredConsole = /Cross-Origin-Opener-Policy header has been ignored/;

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(250); // A fast human's pace; the API limits each member to 600 requests a minute.
  await expect(page.getByRole('status').filter({hasText: /…|\.\.\.|Loading|Finding/})).toHaveCount(0);
}

async function sweepScreen(page: Page, route: string, problems: string[], seenLinks: Set<string>, checkLinks: boolean) {
  await page.goto(route);
  await settle(page);
  const controls = page.locator('main button, main [role="tab"], main summary, main select, header button, nav button');
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible()) || !(await control.isEnabled())) continue;
    const name = ((await control.getAttribute('aria-label')) || (await control.innerText()).trim()).replace(/\s+/g, ' ');
    if (!name && (await control.evaluate((element) => element.tagName)) !== 'SELECT') problems.push(`${route}: a control has no accessible name`);
    if (!name || UNSAFE.test(name)) continue;
    const before = page.url();
    await control.click({trial: false}).catch((error) => problems.push(`${route}: "${name}" could not be pressed (${String(error).split('\n')[0]})`));
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Escape');
    if (page.url() !== before) { await page.goto(route); await settle(page); }
  }
  if (!checkLinks) return;
  for (const href of await page.locator('a[href^="/"]').evaluateAll((links) => links.map((link) => link.getAttribute('href') as string))) {
    if (seenLinks.has(href) || href.startsWith('/api/') || href.startsWith('/admin')) continue;
    seenLinks.add(href);
    await page.goto(href);
    await settle(page);
    if ((await page.title()).startsWith('Page not found')) problems.push(`${route}: link to ${href} is dead`);
  }
}

for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
  test(`every control works at ${viewport.width}px`, async ({browser}) => {
    test.setTimeout(300_000);
    const problems: string[] = [];
    const seen = new Set<string>();
    const context = await browser.newContext({viewport, baseURL: app});
    const page = await context.newPage();
    page.on('console', (message) => { if (message.type() === 'error' && !ignoredConsole.test(message.text())) problems.push(`console: ${message.text()} (${page.url()})`); });
    page.on('response', (response) => { if (response.status() >= 400 && !/no-such-page|\/404$/.test(response.url())) problems.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`); });
    for (const route of ['/', '/login', '/guidelines', '/privacy', '/terms']) await sweepScreen(page, route, problems, seen, viewport.width > 1000);
    await page.goto('/login');
    await page.getByRole('button', {name: 'Try the demo as a sample student'}).click();
    await expect(page).toHaveURL(/\/home$/);
    seen.clear();
    const profile = await (async () => { await page.goto('/discover?tab=swaps'); await settle(page); return page.getByRole('link', {name: /^See swap with/}).first().getAttribute('href'); })();
    const request = await (async () => { await page.goto('/requests'); await settle(page); return page.locator('main a[href^="/requests/"]').first().getAttribute('href'); })();
    for (const route of ['/home', '/discover', '/discover?tab=swaps', '/discover?tab=saved', '/requests', '/requests?tab=active', '/requests?tab=past', profile!, request!, '/me', '/me/edit', '/settings', '/analytics']) {
      // Links are the same at every width, so the phone pass checks controls only.
      await sweepScreen(page, route, problems, seen, viewport.width > 1000);
    }
    await context.close();
    expect(problems).toEqual([]);
  });
}
