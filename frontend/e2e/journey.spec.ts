import {test, expect, type Page, type BrowserContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import process from 'node:process';
import path from 'node:path';
const app = process.env.E2E_APP_URL || 'http://127.0.0.1:8080';
const mail = process.env.E2E_MAIL_URL || 'http://127.0.0.1:8025';
// These tests create and delete synthetic accounts. Never point them at a hosted database.
for (const url of [app, mail]) if (!['127.0.0.1', 'localhost', 'app', 'skillshare-app', 'mail'].includes(new URL(url).hostname)) throw new Error('E2E requires the disposable local Compose stack');
async function audit(page: Page, name: string) {
  console.log(`Auditing ${name}`);
  await expect(page.locator('main').first()).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined))));
  const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  expect(results.violations.map(v => ({id: v.id, nodes: v.nodes.map(n => ({target:n.target, reason:n.failureSummary}))})), name).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${name} horizontal overflow`).toBe(true);
}
async function login(page: Page, email: string, returning = false) {
  console.log('Starting local email login');
  await page.goto('/login');
  await page.getByLabel('Illinois email').fill(email);
  await page.getByRole('button', {name:'Send email code'}).click();
  await expect(page.getByLabel('Email code')).toBeVisible();
  let code = '';
  await expect.poll(async () => {
    const list = await (await page.request.get(`${mail}/api/v1/messages`)).json();
    const message = list.messages?.find((m: {To: {Address: string}[]}) => m.To.some(t => t.Address === email));
    if (!message) return '';
    const body = await (await page.request.get(`${mail}/api/v1/message/${message.ID}`)).json();
    code = (body.Text as string).split('\n').map(line => line.trim()).find(line => /^[A-Z]{4}-[A-Z]{4}$/.test(line)) || '';
    return code;
  }, {timeout:20_000}).not.toBe('');
  await page.getByLabel('Email code').fill(code);
  await page.getByRole('button', {name:'Verify and sign in'}).click();
  await expect(page).toHaveURL(returning ? /\/dashboard$/ : /\/onboarding$/);
}
async function onboard(page: Page, name: string, skill: string, goal: string) {
  await page.getByLabel('Display Name *').fill(name);
  await page.getByLabel('Major *').fill('Computer Science');
  await page.getByLabel('Year *').selectOption('junior');
  await page.getByLabel('Headline *').fill(`Local browser fixture offering ${skill} help`);
  await page.getByLabel('Bio').fill('Synthetic local test account. Practical collaboration and skill sharing.');
  await audit(page, 'onboarding basic');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByRole('button', {name:skill,exact:true}).first().click();
  await page.getByLabel('What have you done with this skill?').fill(`Built projects with ${skill}`);
  await page.getByRole('group', {name:'What would you like to learn?'}).getByRole('button',{name:goal,exact:true}).click();
  await audit(page,'onboarding skills');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Add availability window'}).click();
  await page.getByLabel('Day 1').selectOption('wednesday');
  await page.getByLabel('Time 1').selectOption('evening');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await audit(page,'onboarding contacts');
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByRole('button', {name:'Continue',exact:true}).click();
  await page.getByLabel('Publish my profile for eligible signed-in members').check();
  await page.getByLabel('Share selected contact methods after a request is accepted').check();
  await page.getByRole('button',{name:'Save Profile',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return (await (await page.request.get(`${app}/api/profiles/me/`)).json()).id as number;
}
async function removeAccount(context: BrowserContext, email: string) {
  const csrf = (await context.cookies()).find(c => c.name === 'csrftoken')?.value;
  if (csrf) await context.request.post(`${app}/api/auth/delete/`, {data:{confirmation:email},headers:{'X-CSRFToken':csrf}});
}
test('two members onboard, discover, accept, complete, review, manage privacy and log out', async ({browser}) => {
  const stamp = Date.now(); const helperEmail=`e2e-helper-${stamp}@illinois.edu`, seekerEmail=`e2e-seeker-${stamp}@illinois.edu`;
  const helper = await browser.newContext({viewport:{width:390,height:844}}), seeker = await browser.newContext({viewport:{width:1440,height:1000}});
  const h=await helper.newPage(), s=await seeker.newPage();
  h.on('dialog', dialog => dialog.accept()); s.on('dialog', dialog => dialog.accept('Local test report'));
  try {
    await s.goto('/'); await audit(s,'landing'); await s.goto('/login'); await audit(s,'login');
    await login(h,helperEmail); const helperId=await onboard(h,'Local test helper','React','Resume Review');
    await login(s,seekerEmail); await onboard(s,'Local test seeker','GitHub','React');
    await audit(s,'dashboard');
    await s.goto('/discover');
    const next=s.getByRole('button',{name:'Next page',exact:true});
    if (process.env.E2E_PAGINATION_FIXTURES === 'true') {
      await expect(next).toBeEnabled(); await next.click(); await expect(s.getByText('Page 2',{exact:true})).toBeVisible();
      await s.getByRole('button',{name:'Previous page',exact:true}).click(); await expect(s.getByText('Page 1',{exact:true})).toBeVisible();
    }
    await s.getByRole('textbox',{name:'Search helpers'}).fill('React');
    await expect(s.getByText('Local test helper',{exact:true})).toBeVisible(); await audit(s,'discovery');
    await s.screenshot({path:path.resolve('../docs/screenshots/discovery-desktop.png'),fullPage:true});
    await s.setViewportSize({width:390,height:844}); await audit(s,'mobile discovery');
    await s.getByRole('button',{name:'Toggle filters'}).click(); await expect(s.getByLabel('Filter by year')).toBeVisible(); await audit(s,'mobile filters');
    await s.getByRole('button',{name:'Toggle filters'}).click();
    await s.screenshot({path:path.resolve('../docs/screenshots/discovery-mobile.png'),fullPage:true});
    await s.goto(`/profiles/${helperId}`); await audit(s,'mobile profile');
    await expect(s.locator(`a[href="mailto:${helperEmail}"]`)).toHaveCount(0);
    const send=s.getByRole('button',{name:'Send Help Request',exact:true}); await send.click();
    const modal=s.getByRole('dialog'); await expect(modal).toBeVisible(); await audit(s,'request dialog');
    await modal.getByRole('button',{name:'Close help request'}).focus();
    await s.keyboard.press('Shift+Tab'); await expect(modal.getByRole('button',{name:'Send Request',exact:true})).toBeFocused();
    await s.keyboard.press('Tab'); await expect(modal.getByRole('button',{name:'Close help request'})).toBeFocused();
    await s.keyboard.press('Escape'); await expect(modal).toHaveCount(0); await expect(send).toBeFocused(); await send.click();
    await s.getByLabel(/^Topic/).fill('React collaboration');
    await s.getByLabel(/^Related Skill/).selectOption('React');
    await s.getByLabel(/^Message/).fill('Can you help debug a React state transition in this local test?');
    await modal.getByRole('button',{name:'Send Request',exact:true}).click(); await expect(modal).toHaveCount(0);
    await h.goto('/requests'); await expect(h.getByText('React collaboration',{exact:true})).toBeVisible(); await audit(h,'requests');
    await h.getByRole('button',{name:'Accept',exact:true}).click(); await expect(h.getByRole('button',{name:'Mark Complete',exact:true})).toBeVisible();
    await s.reload(); await expect(s.locator(`a[href="mailto:${helperEmail}"]`)).toBeVisible();
    await h.getByRole('button',{name:'Mark Complete',exact:true}).click(); await expect(h.getByText('Completed',{exact:true})).toBeVisible();
    await s.goto('/connections'); await expect(s.getByText('Local test helper',{exact:true})).toBeVisible(); await audit(s,'connections');
    await s.goto(`/profiles/${helperId}`); await s.getByRole('button',{name:'Add Review',exact:true}).click();
    await s.getByLabel('Completed request').selectOption({label:'React collaboration'});
    await s.getByLabel('Review feedback').fill('Clear and helpful React collaboration.'); await audit(s,'review form');
    await s.getByRole('button',{name:'Submit Review',exact:true}).click(); await expect(s.getByText('Clear and helpful React collaboration.',{exact:true})).toBeVisible();
    await s.getByRole('button',{name:'Endorse Skill',exact:true}).click();
    await s.getByLabel('Endorsement skill').selectOption({label:'React'}); await s.getByRole('button',{name:'Submit Endorsement',exact:true}).click();
    await expect(s.getByText('Recent endorsements',{exact:true})).toBeVisible();
    await s.getByRole('button',{name:'Save Local test helper',exact:true}).click(); await s.goto('/saved'); await expect(s.getByText('Local test helper',{exact:true})).toBeVisible(); await audit(s,'saved');
    await s.goto('/profile/edit'); await expect(s.getByRole('heading',{name:'Edit Profile',exact:true})).toBeVisible(); await audit(s,'editor');
    await s.goto('/settings'); await audit(s,'settings');
    await h.goto('/settings'); await h.getByLabel('Share selected contacts after acceptance').uncheck();
    await expect(h.getByText('Preference saved.',{exact:true})).toBeVisible(); await s.goto(`/profiles/${helperId}`); await expect(s.locator(`a[href="mailto:${helperEmail}"]`)).toHaveCount(0);
    await h.getByLabel('Published for eligible signed-in members').uncheck(); await expect(h.getByLabel('Published for eligible signed-in members')).not.toBeChecked();
    await s.reload(); await expect(s.getByRole('heading',{name:'Profile could not be loaded'})).toBeVisible();
    await h.getByLabel('Published for eligible signed-in members').check(); await expect(h.getByLabel('Published for eligible signed-in members')).toBeChecked();
    await s.reload(); await s.getByRole('button',{name:'Report member',exact:true}).click(); await expect(s.getByText('Report sent to moderators.',{exact:true})).toBeVisible();
    await s.getByRole('button',{name:'Block member',exact:true}).click(); await expect(s.getByRole('heading',{name:'Profile could not be loaded'})).toBeVisible();
    await s.goto('/settings'); await s.getByRole('button',{name:/Unblock Local test helper/}).click(); await expect(s.getByText('No blocked users.',{exact:true})).toBeVisible();
    await h.goto('/dashboard'); await h.getByRole('button',{name:'Notifications',exact:true}).click(); await h.getByRole('button',{name:'Mark all read',exact:true}).click();
    await expect(h.getByRole('button',{name:'Mark all read',exact:true})).toHaveCount(0);
    await h.reload(); await h.getByRole('button',{name:'Notifications',exact:true}).click(); await expect(h.getByRole('button',{name:'Mark all read',exact:true})).toHaveCount(0);
    await s.goto('/analytics'); await audit(s,'personal analytics');
    await s.goto('/settings'); await s.getByRole('button',{name:'Sign out',exact:true}).click(); await expect(s).toHaveURL(/\/login$/);
    expect((await s.request.get(`${app}/api/auth/me/`)).status()).toBe(401);
    await s.goto('/dashboard'); await expect(s).toHaveURL(/\/login$/);
    await login(s,seekerEmail,true);
    await s.goto('/settings'); await s.getByLabel('Type your email to confirm permanent deletion').fill(seekerEmail);
    await s.getByRole('button',{name:'Delete my account permanently'}).click(); await expect(s).toHaveURL(/\/login$/);
    // Exercise deletion through the real UI for the still-authenticated helper.
    await h.goto('/settings'); await h.getByLabel('Type your email to confirm permanent deletion').fill(helperEmail);
    await h.getByRole('button',{name:'Delete my account permanently'}).click(); await expect(h).toHaveURL(/\/login$/);
  } finally {
    // Also attempt cleanup if an assertion fails before the UI deletion steps.
    await removeAccount(helper,helperEmail); await removeAccount(seeker,seekerEmail);
    await helper.close(); await seeker.close();
  }
});
