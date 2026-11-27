import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

const systemChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const useSystemChrome =
  !process.env.CI && !fs.existsSync(`${process.env.LOCALAPPDATA || ''}\\ms-playwright`) && fs.existsSync(systemChrome);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    ...(useSystemChrome ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

