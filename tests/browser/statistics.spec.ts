import {test,expect} from '@playwright/test';
import {loadEnvFile} from 'node:process';
import {existsSync} from 'node:fs';

if(existsSync('.env.local'))loadEnvFile('.env.local');
// Never save traces containing the operator password or authenticated cookie.
test.use({trace:'off',video:'off'});

test('private statistics: login, origin boundaries, cookie flags, period navigation and logout',async({page,context,baseURL,browserName},testInfo)=>{
  test.skip(!process.env.STATS_PASSWORD,'Requires the local operator test configuration');
  test.skip(browserName==='webkit'&&!baseURL?.startsWith('https:'),'WebKit requires HTTPS for the production Secure cookie; run this profile against the HTTPS deployment.');
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto('/verwaltung');
  await expect(page.getByRole('heading',{name:'Statistik',exact:true})).toBeVisible();
  await expect(page.getByText('Gemeldete Kosten',{exact:true})).toHaveCount(0);
  expect(response?.headers()['cache-control']).toContain('no-store');
  expect(response?.headers()['x-robots-tag']).toContain('noindex');
  const noOrigin=await context.request.post('/api/admin/session',{data:{password:'wrong'}});expect(noOrigin.status()).toBe(403);
  const crossOrigin=await context.request.post('/api/admin/session',{headers:{origin:'https://example.org'},data:{password:'wrong'}});expect(crossOrigin.status()).toBe(403);
  const wrong=await context.request.post('/api/admin/session',{headers:{origin:new URL(baseURL!).origin},data:{password:'wrong'}});expect(wrong.status()).toBe(401);
  await page.getByLabel('Betreiberpasswort').fill(process.env.STATS_PASSWORD!);
  const loginResponse=page.waitForResponse(response=>response.url().endsWith('/api/admin/session')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Statistik öffnen'}).click();
  const cookieHeader=await (await loginResponse).headerValue('set-cookie');
  const attributes=cookieHeader?.split(';').slice(1).join(';').toLowerCase();
  expect(attributes).toContain('samesite=strict');expect(attributes).toContain('httponly');expect(attributes).toContain('secure');
  await expect(page.getByRole('heading',{name:'KI-Verbrauch',exact:true})).toBeVisible();
  await expect(page.getByText('Gemeldete Kosten',{exact:true})).toBeVisible();
  const session=(await context.cookies()).find(cookie=>cookie.name==='buchtutor-statistik');
  expect(Boolean(session)).toBe(true);expect(session?.httpOnly).toBe(true);expect(session?.path).toBe('/verwaltung');expect(session?.secure).toBe(true);
  // Windows WebKit's cookie inspector reports None; verify the actual Set-Cookie header above in every browser.
  if(browserName==='chromium')expect(session?.sameSite).toBe('Strict');
  await page.getByRole('link',{name:'7 Tage',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(7);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'work/stats-'+testInfo.project.name+'.png',fullPage:true});
  await page.getByRole('button',{name:'Abmelden',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Statistik',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('Gemeldete Kosten',{exact:true})).toHaveCount(0);
  expect((await context.cookies()).some(cookie=>cookie.name==='buchtutor-statistik')).toBe(false);
  expect(errors).toEqual([]);
});
