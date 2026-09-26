import {defineConfig} from '@playwright/test';
import readerConfig from './playwright.config';

export default defineConfig({
  ...readerConfig,
  testMatch:'**/statistics.spec.ts',testIgnore:[],
  outputDir:'./work/stats-test-results',
  use:{...readerConfig.use,baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://localhost:3002',trace:'off'},
});
