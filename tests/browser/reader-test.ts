import {test as base,type BrowserContext} from '@playwright/test';
import {ONBOARDING_KEY} from '../../lib/onboarding';
import {defaultPrefs} from '../../lib/preferences';
/** Offline/Scribble scenarios explicitly retain the saved opt-out. */
export async function useLocalHandwriting(context:BrowserContext){
 await context.addInitScript(value=>localStorage.setItem('leseraum-reading-preferences-v1',JSON.stringify(value)),{...defaultPrefs,handwritingCloud:false});
}
// Existing feature tests start as returning visitors; onboarding has its own
// first-visit tests which deliberately use Playwright's unmodified fixture.
export const test=base.extend<{returningVisitor:void}>({returningVisitor:[async({context},use)=>{
 await context.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);await use();
},{auto:true}]});
export {expect} from '@playwright/test';
export type {Page} from '@playwright/test';
