import {test, expect, type Browser, type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Signs in to the fictional demo network (DEMO_MODE=true) and writes docs/screenshots and docs/demo.
const app = process.env.E2E_APP_URL || 'http://127.0.0.1:8080';
if (!['127.0.0.1', 'localhost', 'skillshare-app'].includes(new URL(app).hostname)) throw new Error('The tour only runs against a local demo stack');
const out = path.resolve('../docs/screenshots');
const desktop = {width: 1440, height: 900};
const mobile = {width: 390, height: 844};

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('status').filter({hasText: /…|\.\.\.|Loading|Finding/})).toHaveCount(0);
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined))));
}
async function shot(page: Page, name: string, fullPage = false) {
  await settle(page);
  await page.screenshot({path: path.join(out, `${name}.png`), fullPage});
}
async function signIn(browser: Browser, viewport: {width: number; height: number}, account: 'member' | 'staff' = 'member', recordVideo?: {dir: string; size: {width: number; height: number}}) {
  const context = await browser.newContext({viewport, recordVideo, baseURL: app});
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByRole('button', {name: account === 'staff' ? 'Or view the demo moderator screens' : 'Try the demo as a sample student'}).click();
  await expect(page).toHaveURL(account === 'staff' ? /\/analytics$/ : /\/home$/);
  return page;
}

test('product tour', async ({browser}) => {
  fs.mkdirSync(out, {recursive: true});
  const visitor = await browser.newPage({viewport: desktop});
  await visitor.goto(`${app}/`);
  await shot(visitor, 'landing-desktop');
  await visitor.setViewportSize(mobile);
  await shot(visitor, 'landing-mobile');
  await visitor.close();

  const page = await signIn(browser, desktop);
  await shot(page, 'home-desktop');
  await page.goto('/discover?tab=swaps');
  await shot(page, 'swaps-desktop');
  await page.goto('/discover');
  await page.getByRole('textbox', {name: 'Search helpers'}).fill('interview');
  await expect(page.getByText('Priya Natarajan')).toBeVisible();
  await shot(page, 'discover-desktop');
  await page.getByRole('link', {name: /Priya Natarajan/}).first().click();
  await expect(page.getByText(/Swap match\./)).toBeVisible();
  await shot(page, 'profile-desktop');
  await page.goto('/requests');
  await shot(page, 'requests-desktop');
  await page.getByRole('link', {name: 'Speech practice for help reading survey data'}).click();
  await expect(page.getByRole('button', {name: 'Accept'})).toBeVisible();
  await shot(page, 'request-detail-desktop');
  await page.context().close();

  const phone = await signIn(browser, mobile);
  await shot(phone, 'home-mobile');
  await phone.goto('/discover?tab=swaps');
  await shot(phone, 'swaps-mobile');
  await phone.context().close();

  const staff = await signIn(browser, desktop, 'staff');
  await expect(staff.getByRole('heading', {name: 'Launch metrics'})).toBeVisible();
  await staff.getByRole('heading', {name: 'Launch metrics'}).scrollIntoViewIfNeeded();
  await shot(staff, 'launch-metrics-desktop');
  await staff.context().close();
});

test('demo video', async ({browser}) => {
  const dir = path.resolve('test-results/tour-video');
  const size = {width: 1280, height: 800};
  const page = await signIn(browser, size, 'member', {dir, size});
  const pause = (ms = 1400) => page.waitForTimeout(ms);
  await settle(page); await pause(2000);
  await page.goto('/discover?tab=swaps'); await settle(page); await pause();
  await page.getByRole('link', {name: 'See swap with Priya Natarajan'}).click(); await settle(page); await pause();
  await page.mouse.wheel(0, 600); await pause();
  await page.goto('/requests'); await settle(page); await pause();
  await page.getByRole('link', {name: 'Speech practice for help reading survey data'}).click(); await settle(page); await pause();
  await page.getByRole('button', {name: 'Accept'}).click();
  await expect(page.getByText(/contact details/).first()).toBeVisible(); await pause(2000);
  const video = page.video();
  await page.context().close();
  fs.mkdirSync(path.resolve('../docs/demo'), {recursive: true});
  await video!.saveAs(path.resolve('../docs/demo/tour.webm'));
});
