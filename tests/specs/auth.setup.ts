import { test as setup } from '../fixtures/test';
import { authFile, env } from '../utils/env';

/**
 * Produces playwright/.auth/<browser>.json, the logged-in session that browser's specs reuse.
 * The project (setup-<browser>) already starts from that file when it exists.
 *
 * Login = email + password, then a verification step guarded by reCAPTCHA + an emailed code.
 * That step is done by a person on purpose (a CAPTCHA must not be bypassed), so:
 *  1. a still-valid saved session is reused, and no login happens at all
 *  2. otherwise, in a headed run (`npm run auth`) the script logs in and waits for the person
 *  3. otherwise (headless) it fails fast instead of waiting for someone who isn't there
 */
const HUMAN_STEP_TIMEOUT_MS = 4 * 60_000;

setup('authenticate', async ({ page, headless, browserName, homePage, loginPage }) => {
  const sessionFile = authFile(browserName);

  await homePage.goto();
  if (await homePage.isLoggedIn()) {
    // Re-save so any cookies the server rotated are kept fresh.
    await page.context().storageState({ path: sessionFile });
    return;
  }

  if (headless !== false) {
    throw new Error(
      `No valid saved ${browserName} session. Logging in needs a person (reCAPTCHA + emailed code): run \`npm run auth\` first.`,
    );
  }

  // Room for the person on top of the login itself.
  setup.setTimeout(HUMAN_STEP_TIMEOUT_MS + 60_000);
  await loginPage.goto();
  await loginPage.cookieBanner.acceptIfShown();
  const otpPage = await loginPage.login(env.userEmail, env.userPassword);

  console.log(
    [
      '',
      `>>> Action needed in the ${browserName} window:`,
      `    ${(await otpPage.hasCaptcha()) ? 'tick "I\'m not a robot", ' : ''}enter the verification code emailed to ${env.userEmail}, then click Verify.`,
      `    Waiting up to ${HUMAN_STEP_TIMEOUT_MS / 60_000} minutes...`,
      '',
    ].join('\n'),
  );
  await otpPage.completeByHand(HUMAN_STEP_TIMEOUT_MS);

  await page.context().storageState({ path: sessionFile });
});
