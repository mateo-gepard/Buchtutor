import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/browser',
  testIgnore:'**/statistics.spec.ts',
  outputDir:'./work/selection-test-results',
  fullyParallel:true,
  workers:2,
  timeout:30000,
  expect:{timeout:8000},
  reporter:'list',
  use:{baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://localhost:3001',trace:'retain-on-failure'},
  projects:[
    {name:'desktop-chromium',use:{browserName:'chromium',viewport:{width:1440,height:900}}},
    {name:'mobile-chromium',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}},
    {name:'ipad-webkit-portrait',use:{browserName:'webkit',viewport:{width:834,height:1194},isMobile:true,hasTouch:true,deviceScaleFactor:2}},
    {name:'ipad-webkit-landscape',use:{browserName:'webkit',viewport:{width:1194,height:834},isMobile:true,hasTouch:true,deviceScaleFactor:2}},
  ],
});
