import {test, expect, type Browser, type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Signs in to the fictional demo network (DEMO_MODE=true) and writes docs/screenshots and docs/demo.
const app = process.env.E2E_APP_URL || 'http://127.0.0.1:8080';
const mail = process.env.E2E_MAIL_URL || 'http://127.0.0.1:8025';
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
  for (const close of await page.getByRole('button', {name: 'Dismiss notification'}).all()) await close.click();
  await expect(page.getByRole('button', {name: 'Dismiss notification'})).toHaveCount(0);
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => undefined))));
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

async function readCode(page: Page, email: string) {
  let code = '';
  await expect.poll(async () => {
    const list = await (await page.request.get(`${mail}/api/v1/messages`)).json();
    const message = list.messages?.find((m: {To: {Address: string}[]}) => m.To.some(t => t.Address === email));
    if (!message) return '';
    const body = await (await page.request.get(`${mail}/api/v1/message/${message.ID}`)).json();
    code = (body.Text as string).split('\n').map(line => line.trim()).find(line => /^[A-Z]{4}-[A-Z]{4}$/.test(line)) || '';
    return code;
  }, {timeout: 20_000}).not.toBe('');
  return code;
}

// A brand-new student signs up, sets up, proposes a swap, and the demo student accepts and completes it.
// The new account is deleted afterwards, and make screenshots resets the demo network.
test('new student journey', async ({browser}) => {
  fs.mkdirSync(out, {recursive: true});
  // The reserved demo suffix lets seed_demo --reset remove this account even if the tour stops early.
  const email = 'jamie.ortiz.demo@illinois.edu';
  const context = await browser.newContext({viewport: desktop, baseURL: app});
  const jamie = await context.newPage();
  try {
    await jamie.goto('/login');
    await jamie.getByLabel('Illinois email').fill(email);
    await jamie.getByRole('button', {name: 'Send email code'}).click();
    await expect(jamie.getByLabel('Email code')).toBeVisible();
    await shot(jamie, 'signin-code-desktop');
    await jamie.getByLabel('Email code').fill(await readCode(jamie, email));
    await jamie.getByRole('button', {name: 'Verify and sign in'}).click();
    await expect(jamie).toHaveURL(/\/welcome$/);
    const proceed = () => jamie.getByRole('button', {name: 'Continue', exact: true}).click();
    await jamie.getByLabel('Display name').fill('Jamie Ortiz');
    await jamie.getByLabel('Major').fill('Graphic Design');
    await jamie.getByLabel('Year').selectOption('sophomore');
    await jamie.getByLabel('Headline').fill('Design student who makes Figma prototypes');
    await proceed();
    await jamie.getByRole('group', {name: /^Skills you can teach:/}).getByRole('button', {name: 'Figma', exact: true}).click();
    await jamie.getByLabel('What have you done with Figma?').fill('Prototyped two class projects and an RSO app');
    await shot(jamie, 'setup-teach-desktop');
    await proceed();
    for (const goal of ['Python', 'Interview Prep']) await jamie.getByRole('group', {name: /^Skills you want to learn:/}).getByRole('button', {name: goal, exact: true}).click();
    await proceed();
    for (const slot of ['Tue evening', 'Thu evening']) await jamie.getByRole('button', {name: slot, exact: true}).click();
    await jamie.getByRole('button', {name: 'Go live', exact: true}).click();
    await expect(jamie.getByRole('heading', {name: 'You could swap with'})).toBeVisible();
    await shot(jamie, 'first-matches-desktop');

    await jamie.getByRole('link', {name: 'See swap with Alex Rivera'}).click();
    await jamie.getByRole('button', {name: 'Propose a swap'}).click();
    const dialog = jamie.getByRole('dialog');
    await dialog.getByLabel(/Message/).fill("Hi Alex! I'd love help getting started with Python, and I can walk you through Figma prototyping in return. Free Tuesday or Thursday evenings.");
    await shot(jamie, 'swap-proposal-desktop');
    await dialog.getByRole('button', {name: 'Send swap proposal', exact: true}).click();
    await expect(dialog).toHaveCount(0);

    const alex = await signIn(browser, desktop);
    await alex.getByRole('link', {name: /^Reply: /}).first().click();
    await expect(alex.getByText('Jamie wrote')).toBeVisible();
    await shot(alex, 'request-incoming-desktop');
    await alex.getByRole('button', {name: 'Accept', exact: true}).click();
    await expect(alex.getByText("Jamie's contact details")).toBeVisible();
    await shot(alex, 'request-accepted-desktop');
    await alex.getByRole('button', {name: 'Mark complete', exact: true}).click();
    await expect(alex.getByRole('heading', {name: 'How did it go with Jamie?'})).toBeVisible();
    await alex.locator('label').filter({hasText: '5 stars'}).click();
    await alex.getByLabel('What went well?').fill('Jamie walked me through components and auto layout. Super patient.');
    await shot(alex, 'feedback-desktop');
    await alex.getByRole('button', {name: 'Submit feedback'}).click();
    await expect(alex.getByRole('heading', {name: 'Your feedback'})).toBeVisible();
    await alex.context().close();
  } finally {
    const csrf = (await context.cookies()).find(c => c.name === 'csrftoken')?.value;
    if (csrf) await context.request.post(`${app}/api/auth/delete/`, {data: {confirmation: email}, headers: {'X-CSRFToken': csrf}});
    await context.close();
  }
});

test('product tour', async ({browser}) => {
  fs.mkdirSync(out, {recursive: true});
  const visitor = await browser.newPage({viewport: desktop});
  await visitor.goto(`${app}/`);
  await shot(visitor, 'landing-desktop');
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
