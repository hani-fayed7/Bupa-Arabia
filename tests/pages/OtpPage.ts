import { type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Verification code step shown after a successful email + password submit.
 * The 4-digit code is emailed from noreply@careers.bupa.com.sa ("Your Bupa Verification Code").
 */
export class OtpPage extends BasePage {
  readonly codeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.codeInput = page.getByRole('textbox', { name: 'Verification code' });
    this.verifyButton = page.getByRole('button', { name: 'Verify' });
  }

  /** Submits the code and waits until the site reports the user as logged in. */
  async verify(code: string): Promise<void> {
    if (!/^\d{4}$/.test(code)) {
      throw new Error(`Verification code must be exactly 4 digits, got "${code}".`);
    }
    await this.codeInput.fill(code);
    await this.verifyButton.click();
    // A "Loading..." overlay shows and closes by itself, then the logged-in page renders.
    await this.waitForLoggedIn();
    await this.waitForLoaders();
  }
}
