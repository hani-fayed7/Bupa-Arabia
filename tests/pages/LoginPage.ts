import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { OtpPage } from './OtpPage';

/**
 * /en/login/: email + password step.
 *
 * The form is a classic full-page POST to /app/control/byt_auth_manager:
 * - valid credentials → the verification code step (OtpPage)
 * - invalid credentials → 302 back to /en/login/ with an alert paragraph inside the form
 */
export class LoginPage extends BasePage {
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  /** Server-side error, e.g. "You've entered an incorrect email or password, please try again." */
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.form = page.locator('#default-login');
    this.emailInput = this.form.getByRole('textbox', { name: 'Email Address' });
    this.passwordInput = this.form.getByRole('textbox', { name: 'Enter your password' });
    this.loginButton = this.form.locator('#loginBtn');
    this.errorMessage = this.form.locator('.alert');
  }

  async goto(): Promise<void> {
    await this.open('login/');
  }

  /** Fills and submits the form without assuming the outcome (e.g. for a wrong-password check). */
  async submitCredentials(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Happy path: submits the credentials and returns the verification code step.
   * Fails fast with the site's own message if the credentials are rejected.
   */
  async login(email: string, password: string): Promise<OtpPage> {
    await this.submitCredentials(email, password);

    const otpPage = new OtpPage(this.page);
    await expect(otpPage.codeInput.or(this.errorMessage)).toBeVisible();
    if (await this.errorMessage.isVisible()) {
      throw new Error(`Login rejected: ${(await this.errorMessage.innerText()).trim()}`);
    }
    return otpPage;
  }
}
