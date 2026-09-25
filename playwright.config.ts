import { defineConfig, devices } from '@playwright/test';
import { AUTH_FILE, env } from './tests/utils/env';

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
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      /* Validates the saved session, or logs in (email + password + verification code) and saves a new one. */
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /* Starts from the saved session. */
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      testIgnore: '**/logged-out/**',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
    {
      /* Everything in logged-out/: no session and no setup, so it runs even when the session has expired. */
      name: 'chromium-logged-out',
      testDir: './tests/specs/logged-out',
      use: { ...devices['Desktop Chrome'], storageState: CONSENT_ONLY_STATE },
    },
    /* Other browsers are optional. The server ties a session to the browser's user agent, so each
       browser needs its own setup project and auth file (and its own logged-out project). */
  ],
});
