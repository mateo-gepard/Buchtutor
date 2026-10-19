import {test as base} from '@playwright/test';
import {ONBOARDING_KEY} from '../../lib/onboarding';
// Existing feature tests start as returning visitors; onboarding has its own
// first-visit tests which deliberately use Playwright's unmodified fixture.
export const test=base.extend<{returningVisitor:void}>({returningVisitor:[async({context},use)=>{
 await context.addInitScript(key=>localStorage.setItem(key,'1'),ONBOARDING_KEY);await use();
},{auto:true}]});
export {expect} from '@playwright/test';
export type {Page} from '@playwright/test';
