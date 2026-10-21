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
  await expect(page).toHaveURL(returning ? /\/home$/ : /\/welcome$/);
}
async function onboard(page: Page, name: string, skill: string, goal: string, shots?: string) {
  const shot = async (step: string) => { if (shots) await page.screenshot({path:path.resolve(`../docs/screenshots/setup-${step}-${shots}.png`),fullPage:true}); };
  const proceed = () => page.getByRole('button', {name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'About you',level:1})).toBeVisible();
  await proceed(); await expect(page.getByText('Add your major or program.',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Display name')).toBeFocused();
  await page.getByLabel('Display name').fill(name);
  await page.getByLabel('Major').fill('Computer Science');
  await page.getByLabel('Year').selectOption('junior');
  await page.getByLabel('Headline').fill(`Local browser fixture offering ${skill} help`);
  await audit(page, 'setup about'); await shot('about');
  await proceed();
  await expect(page.getByRole('heading',{name:'What you can teach',level:1})).toBeVisible();
  await page.getByRole('group', {name:/^Skills you can teach:/}).getByRole('button',{name:skill,exact:true}).click();
  await page.getByLabel(`What have you done with ${skill}?`).fill(`Built projects with ${skill}`);
  await audit(page,'setup teach'); await shot('teach');
  await proceed();
  await page.getByRole('group', {name:/^Skills you want to learn:/}).getByRole('button',{name:goal,exact:true}).click();
  await audit(page,'setup learn');
  await proceed();
  await page.getByRole('button',{name:'Wed evening',exact:true}).click();
  await expect(page.getByLabel('Publish my profile')).toBeChecked();
  await expect(page.getByLabel('Share my contact detail after I accept a request')).toBeChecked();
  await audit(page,'setup availability'); await shot('availability');
  await page.getByRole('button',{name:'Go live',exact:true}).click();
  await expect(page).toHaveURL(/\/welcome\/matches$/);
  await expect(page.getByRole('heading',{name:new RegExp(`^You're live, ${name.split(' ')[0]}!$`)})).toBeVisible();
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
    await s.goto('/'); await audit(s,'landing');
    await s.screenshot({path:path.resolve('../docs/screenshots/landing-desktop.png'),fullPage:true});
    await s.getByRole('link',{name:'See how it works'}).click(); await expect(s).toHaveURL(/#how-it-works$/);
    await h.goto('/'); await audit(h,'mobile landing');
    await h.screenshot({path:path.resolve('../docs/screenshots/landing-mobile.png')});
    await s.goto('/login'); await audit(s,'login');
    await login(h,helperEmail); const helperId=await onboard(h,'Local test helper','React','GitHub','mobile');
    await h.goto('/welcome'); await expect(h).toHaveURL(/\/home$/);
    await login(s,seekerEmail); await onboard(s,'Local test seeker','GitHub','React','desktop');
    await expect(s.getByRole('link',{name:"View Local test helper's profile"})).toBeVisible(); await audit(s,'first matches');
    await s.screenshot({path:path.resolve('../docs/screenshots/welcome-matches-desktop.png'),fullPage:true});
    await s.getByRole('link',{name:'Go to Home',exact:true}).click(); await expect(s).toHaveURL(/\/home$/);
    await expect(s.getByRole('heading',{name:'Hi, Local',level:1})).toBeVisible(); await audit(s,'home');
    await s.screenshot({path:path.resolve('../docs/screenshots/home-desktop.png'),fullPage:true});
    await s.goto('/'); await expect(s).toHaveURL(/\/home$/);
    await s.goto('/login'); await expect(s).toHaveURL(/\/home$/);
    await s.goto('/dashboard'); await expect(s).toHaveURL(/\/home$/);
    await expect(s.getByRole('navigation',{name:'Main'}).getByRole('link')).toHaveText(['Home','Discover','Requests','Profile']);
    await expect(h.getByRole('navigation',{name:'Main'}).getByRole('link')).toHaveText(['Home','Discover','Requests','Profile']);
    await h.screenshot({path:path.resolve('../docs/screenshots/home-mobile.png')});
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
    await s.goto('/discover?tab=swaps'); await expect(s.getByRole('tab',{name:'Swap matches'})).toHaveAttribute('aria-selected','true');
    const swapCard=s.getByRole('link',{name:'See swap with Local test helper'}); await expect(swapCard).toBeVisible(); await audit(s,'mobile swap matches');
    await s.screenshot({path:path.resolve('../docs/screenshots/swaps-mobile.png'),fullPage:true});
    await swapCard.click(); await expect(s).toHaveURL(new RegExp(`/profiles/${helperId}$`)); await audit(s,'mobile profile');
    await expect(s.getByText(/Swap match\./)).toBeVisible();
    await expect(s.getByRole('heading',{name:'Wants to learn'})).toBeVisible();
    await expect(s.locator(`a[href="mailto:${helperEmail}"]`)).toHaveCount(0);
    await s.screenshot({path:path.resolve('../docs/screenshots/profile-swap-mobile.png'),fullPage:true});
    const send=s.getByRole('button',{name:'Propose a swap',exact:true}); await send.click();
    const modal=s.getByRole('dialog'); await expect(modal).toBeVisible(); await audit(s,'swap dialog');
    await expect(modal.getByLabel(/^You want to learn/)).toHaveValue('React');
    await expect(modal.getByLabel(/^You'll teach in return/)).toHaveValue('GitHub');
    await modal.getByRole('button',{name:'Close request'}).focus();
    await s.keyboard.press('Shift+Tab'); await expect(modal.getByRole('button',{name:'Send swap proposal',exact:true})).toBeFocused();
    await s.keyboard.press('Tab'); await expect(modal.getByRole('button',{name:'Close request'})).toBeFocused();
    await s.keyboard.press('Escape'); await expect(modal).toHaveCount(0); await expect(send).toBeFocused(); await send.click();
    await s.getByLabel(/^Topic/).fill('React collaboration');
    await s.getByLabel(/^Message/).fill('I can help with GitHub workflows if you can help debug a React state transition.');
    await modal.getByRole('button',{name:'Send swap proposal',exact:true}).click(); await expect(modal).toHaveCount(0);
    await h.goto('/requests'); await expect(h.getByText('React collaboration',{exact:true})).toBeVisible(); await audit(h,'requests');
    await expect(h.getByText('Swap',{exact:true})).toBeVisible();
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
    await s.getByRole('button',{name:'Save Local test helper',exact:true}).click(); await s.goto('/saved'); await expect(s).toHaveURL(/\/discover\?tab=saved$/); await expect(s.getByText('Local test helper',{exact:true})).toBeVisible(); await audit(s,'saved');
    await s.setViewportSize({width:1440,height:1000}); await s.goto('/discover?tab=swaps'); await expect(s.getByRole('link',{name:'See swap with Local test helper'})).toBeVisible();
    await s.screenshot({path:path.resolve('../docs/screenshots/swaps-desktop.png'),fullPage:true});
    await s.goto(`/profiles/${helperId}`); await s.getByRole('button',{name:'Just ask for help',exact:true}).click(); await expect(s.getByRole('heading',{name:'Ask for help'})).toBeVisible();
    await s.screenshot({path:path.resolve('../docs/screenshots/request-dialog-desktop.png')}); await s.keyboard.press('Escape');
    await s.setViewportSize({width:390,height:844});
    await s.goto('/me'); await expect(s.getByRole('heading',{name:'My profile',exact:true})).toBeVisible(); await audit(s,'my profile');
    await s.goto('/profile/edit?tab=availability'); await expect(s).toHaveURL(/\/me\/edit\?tab=availability$/);
    await expect(s.getByRole('heading',{name:'Edit profile',exact:true})).toBeVisible();
    await expect(s.getByRole('button',{name:'Wed evening',exact:true})).toHaveAttribute('aria-pressed','true'); await audit(s,'editor');
    await s.goto('/settings'); await audit(s,'settings');
    await h.goto('/settings'); await h.getByLabel('Share selected contacts after acceptance').uncheck();
    await expect(h.getByText('Preference saved.',{exact:true})).toBeVisible(); await s.goto(`/profiles/${helperId}`); await expect(s.locator(`a[href="mailto:${helperEmail}"]`)).toHaveCount(0);
    await h.getByLabel('Published for eligible signed-in members').uncheck(); await expect(h.getByLabel('Published for eligible signed-in members')).not.toBeChecked();
    await s.reload(); await expect(s.getByRole('heading',{name:'Profile could not be loaded'})).toBeVisible();
    await h.getByLabel('Published for eligible signed-in members').check(); await expect(h.getByLabel('Published for eligible signed-in members')).toBeChecked();
    await s.reload(); await s.getByRole('button',{name:'Report member',exact:true}).click(); await expect(s.getByText('Report sent to moderators.',{exact:true})).toBeVisible();
    await s.getByRole('button',{name:'Block member',exact:true}).click(); await expect(s.getByRole('heading',{name:'Profile could not be loaded'})).toBeVisible();
    await s.goto('/settings'); await s.getByRole('button',{name:/Unblock Local test helper/}).click(); await expect(s.getByText('No blocked users.',{exact:true})).toBeVisible();
    await h.goto('/home'); await h.getByRole('button',{name:'Notifications',exact:true}).click(); await h.getByRole('button',{name:'Mark all read',exact:true}).click();
    await expect(h.getByRole('button',{name:'Mark all read',exact:true})).toHaveCount(0);
    await h.reload(); await h.getByRole('button',{name:'Notifications',exact:true}).click(); await expect(h.getByRole('button',{name:'Mark all read',exact:true})).toHaveCount(0);
    await s.goto('/analytics'); await audit(s,'personal analytics');
    await s.goto('/settings'); await s.getByRole('button',{name:'Sign out',exact:true}).click(); await expect(s).toHaveURL(/\/login$/);
    expect((await s.request.get(`${app}/api/auth/me/`)).status()).toBe(401);
    await s.goto('/home'); await expect(s).toHaveURL(/\/login$/);
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
