import fs from 'node:fs';
import path from 'node:path';

/**
 * Single source of truth for configuration.
 *
 * - `.env` is loaded once here (Node's built-in loader, no dotenv dependency).
 *   Variables already set in the shell/CI win over the file.
 * - Values are exposed through getters, so a missing credential fails only when
 *   something actually needs it (e.g. the logged-out specs never read the credentials).
 */
const ENV_FILE = path.resolve(__dirname, '../../.env');
if (fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

export const APPLY_MODES = ['apply-withdraw', 'dry-run', 'apply'] as const;
export type ApplyMode = (typeof APPLY_MODES)[number];

export const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export type BrowserName = (typeof BROWSERS)[number];

/**
 * Saved login session for one browser, produced by auth.setup.ts and reused by its specs.
 * One file per browser: the server ties a session to the browser's user agent.
 */
export function authFile(browser: BrowserName): string {
  return path.resolve(__dirname, `../../playwright/.auth/${browser}.json`);
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Add it to .env (see .env.example).`);
  }
  return value;
}

function oneOf<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = process.env[name]?.trim() || fallback;
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${name}="${value}". Expected one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/** Comma-separated list, e.g. "chromium,firefox". Duplicates are dropped. */
function listOf<T extends string>(name: string, allowed: readonly T[], fallback: readonly T[]): T[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [...fallback];
  const values = [...new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))];
  const invalid = values.filter((value) => !allowed.includes(value as T));
  if (invalid.length > 0 || values.length === 0) {
    throw new Error(`Invalid ${name}="${raw}". Expected a comma-separated list of: ${allowed.join(', ')}.`);
  }
  return values as T[];
}

function integerAtLeast(name: string, min: number, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`Invalid ${name}="${raw}". Expected an integer ≥ ${min}.`);
  }
  return value;
}

export const env = {
  /**
   * Must end with "/" so relative paths resolve under the language prefix:
   * new URL('login/', '…/en/') → …/en/login/, but a leading slash ('/login/') would drop "/en".
   */
  get baseUrl(): string {
    const url = process.env.BASE_URL?.trim() || 'https://careers.bupa.com.sa/en/';
    return url.endsWith('/') ? url : `${url}/`;
  },
  /**
   * Account used by one browser: USER_EMAIL_<BROWSER> / USER_PASSWORD_<BROWSER> (e.g. USER_EMAIL_FIREFOX)
   * if set, otherwise the shared USER_EMAIL / USER_PASSWORD. The site keeps one active session per
   * account, so browsers that run logged-in specs together each need their own account.
   */
  credentials(browser: BrowserName): { email: string; password: string } {
    const suffix = browser.toUpperCase();
    return {
      email: process.env[`USER_EMAIL_${suffix}`]?.trim() || required('USER_EMAIL'),
      password: process.env[`USER_PASSWORD_${suffix}`]?.trim() || required('USER_PASSWORD'),
    };
  },
  get applyMode(): ApplyMode {
    return oneOf('APPLY_MODE', APPLY_MODES, 'apply-withdraw');
  },
  get maxJobAttempts(): number {
    return integerAtLeast('MAX_JOB_ATTEMPTS', 1, 5);
  },
  /** Browsers to run. Chromium only by default: every extra browser needs its own human login. */
  get browsers(): BrowserName[] {
    return listOf('BROWSERS', BROWSERS, ['chromium']);
  },
  /** Delay in ms added to every browser action, to follow a headed run by eye (0 = off). */
  get slowMo(): number {
    return integerAtLeast('SLOW_MO', 0, 0);
  },
};
