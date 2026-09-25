import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Verification code step shown after a successful email + password submit.
 * The 4-digit code is emailed from noreply@careers.bupa.com.sa ("Your Bupa Verification Code").
 *
 * The step is protected by a reCAPTCHA v2 checkbox, which is never automated: a person
 * completes it (see completeByHand). `verify(code)` is kept for a test environment where the
 * CAPTCHA is disabled or uses Google's test keys.
 */
export class OtpPage extends BasePage {
  readonly codeInput: Locator;
  readonly verifyButton: Locator;
  readonly captchaFrame: Locator;

  constructor(page: Page) {
    super(page);
    this.codeInput = page.getByRole('textbox', { name: 'Verification code' });
    this.verifyButton = page.getByRole('button', { name: 'Verify' });
    this.captchaFrame = page.locator('iframe[title="reCAPTCHA"]');
  }

  async hasCaptcha(): Promise<boolean> {
    return this.captchaFrame.isVisible();
  }

  /** Submits the code and waits until the site reports the user as logged in. */
  async verify(code: string): Promise<void> {
    if (!/^\d{4}$/.test(code)) {
      throw new Error(`Verification code must be exactly 4 digits, got "${code}".`);
    }
    await this.codeInput.fill(code);
    await this.verifyButton.click();
    await this.waitUntilVerified();
  }

  /**
   * Waits while a person ticks the reCAPTCHA, types the emailed code and clicks Verify
   * in the headed browser.
   */
  async completeByHand(timeoutMs: number): Promise<void> {
    await this.codeInput.focus();
    await this.waitUntilVerified({ timeout: timeoutMs });
  }

  private async waitUntilVerified(options?: { timeout?: number }): Promise<void> {
    // A "Loading..." overlay shows and closes by itself, then the logged-in page renders.
    await this.waitForLoggedIn(options);
    await this.waitForLoaders();
  }
}
