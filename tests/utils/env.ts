import fs from 'node:fs';
import path from 'node:path';

/**
 * Single source of truth for configuration.
 *
 * - `.env` is loaded once here (Node's built-in loader, no dotenv dependency).
 *   Variables already set in the shell/CI win over the file.
 * - Values are exposed through getters, so a missing credential fails only when
 *   something actually needs it (e.g. a negative login test runs without USER_PASSWORD).
 */
const ENV_FILE = path.resolve(__dirname, '../../.env');
if (fs.existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

export const APPLY_MODES = ['apply-withdraw', 'dry-run', 'apply'] as const;
export type ApplyMode = (typeof APPLY_MODES)[number];

export const OTP_PROVIDERS = ['manual'] as const;
export type OtpProviderName = (typeof OTP_PROVIDERS)[number];

/** Saved login session, produced by auth.setup.ts and reused by every spec. */
export const AUTH_FILE = path.resolve(__dirname, '../../playwright/.auth/user.json');

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

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${name}="${raw}". Expected a positive integer.`);
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
  get userEmail(): string {
    return required('USER_EMAIL');
  },
  get userPassword(): string {
    return required('USER_PASSWORD');
  },
  get otpProvider(): OtpProviderName {
    return oneOf('OTP_PROVIDER', OTP_PROVIDERS, 'manual');
  },
  get applyMode(): ApplyMode {
    return oneOf('APPLY_MODE', APPLY_MODES, 'apply-withdraw');
  },
  get maxJobAttempts(): number {
    return positiveInt('MAX_JOB_ATTEMPTS', 5);
  },
};
