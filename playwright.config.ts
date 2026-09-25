import fs from 'node:fs';
import { defineConfig, devices, type Project } from '@playwright/test';
import { authFile, env, type BrowserName } from './tests/utils/env';

/**
 * Starting state for logged-out specs: no cookies (so no session), only the cookie-banner consent
 * the site keeps in localStorage, so the banner never slides in over the page.
 */
const CONSENT_ONLY_STATE = {
  cookies: [],
  origins: [
    {
      origin: new URL(env.baseUrl).origin,
      localStorage: [{ name: 'talentera_privacy_policy', value: '1' }],
    },
  ],
};

const DEVICE: Record<BrowserName, string> = {
  chromium: 'Desktop Chrome',
  firefox: 'Desktop Firefox',
  webkit: 'Desktop Safari',
};

/**
 * Three projects per browser. The server ties a session to the browser's user agent, so each
 * browser has its own setup project and its own saved session file.
 *  - setup-<browser>:       validates that browser's saved session, or logs in (a person completes
 *                           the reCAPTCHA + emailed code) and saves a new one
 *  - <browser>:             logged-in specs, starting from that session
 *  - <browser>-logged-out:  everything in logged-out/: no session and no setup, so it runs
 *                           even when the session has expired
 */
function browserProjects(browser: BrowserName): Project[] {
  const device = devices[DEVICE[browser]];
  const sessionFile = authFile(browser);
  return [
    {
      name: `setup-${browser}`,
      testMatch: /.*\.setup\.ts/,
      // Start from the saved session, if there is one, so it can be validated and reused.
      use: { ...device, storageState: fs.existsSync(sessionFile) ? sessionFile : undefined },
    },
    {
      name: browser,
      testMatch: /.*\.spec\.ts/,
      testIgnore: '**/logged-out/**',
      dependencies: [`setup-${browser}`],
      use: { ...device, storageState: sessionFile },
    },
    {
      name: `${browser}-logged-out`,
      testDir: './tests/specs/logged-out',
      use: { ...device, storageState: CONSENT_ONLY_STATE },
    },
  ];
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/specs',
  /* One real account on a live site: parallel sessions can invalidate each other or trigger a CAPTCHA. */
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* No automatic retries: the apply flow has real side effects, so a failure should be looked at, not replayed. */
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  /* Live third-party site: allow for slow AJAX responses. */
  timeout: 90_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: env.baseUrl,
    locale: 'en-US',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    /* SLOW_MO (ms) slows every action down, to follow a headed run or a demo by eye. */
    launchOptions: { slowMo: env.slowMo },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* BROWSERS (default "chromium") picks which browsers get projects, e.g. BROWSERS=chromium,firefox,webkit. */
  projects: env.browsers.flatMap(browserProjects),
});
