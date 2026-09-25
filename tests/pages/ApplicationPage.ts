import { expect, type Dialog, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type ApplicationOutcome =
  | { status: 'submitted' }
  /** "Your CV doesn't match the requirements…" with Apply anyway / Do not apply. */
  | { status: 'mismatch'; message: string }
  /** Not eligible, CV incomplete, or any other message that ends the attempt. */
  | { status: 'blocked'; message: string };

/**
 * /en/job-application/?jb_id=<id>: contact details (read-only), optional cover letter, "Apply Now".
 *
 * Clicking "Apply Now" first runs a pre-check (synchronous AJAX), then either submits the form
 * (full-page POST) or opens a baytModal / native alert explaining why it did not.
 */
export class ApplicationPage extends BasePage {
  readonly heading: Locator;
  readonly submitButton: Locator;
  readonly confirmationMessage: Locator;
  /** jQuery SimpleModal container used by every site pop-up, including the loading one. */
  readonly modal: Locator;
  readonly applyAnywayButton: Locator;
  readonly doNotApplyButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1, name: /^Apply to .+ Job$/ });
    this.submitButton = page.getByRole('button', { name: 'Apply Now' });
    this.confirmationMessage = page.getByText(/Your application has been submitted successfully/i);
    this.modal = page.locator('#modalpopup');
    this.applyAnywayButton = this.modal.getByRole('button', { name: 'Apply anyway' });
    this.doNotApplyButton = this.modal.getByRole('button', { name: 'Do not apply' });
  }

  async submit(): Promise<ApplicationOutcome> {
    const alerts: string[] = [];
    const recordAlert = (dialog: Dialog) => {
      alerts.push(dialog.message());
      void dialog.dismiss();
    };

    this.page.on('dialog', recordAlert);
    try {
      await this.submitButton.click();
      let outcome: ApplicationOutcome | undefined;
      await expect(async () => {
        outcome = await this.readOutcome(alerts);
        expect(outcome, 'Waiting for a confirmation, a pop-up or an alert after "Apply Now"').toBeDefined();
      }).toPass({ timeout: 30_000 });
      await this.waitForLoaders();
      return outcome!;
    } finally {
      this.page.off('dialog', recordAlert);
    }
  }

  /** Closes the mismatch pop-up without applying. */
  async declineMismatch(): Promise<void> {
    await this.doNotApplyButton.click();
    await expect(this.modal).toBeHidden();
  }

  private async readOutcome(alerts: string[]): Promise<ApplicationOutcome | undefined> {
    if (await this.confirmationMessage.isVisible()) return { status: 'submitted' };
    if (await this.applyAnywayButton.isVisible()) return { status: 'mismatch', message: await this.modalText() };
    if (alerts.length > 0) return { status: 'blocked', message: alerts.join(' | ') };
    const isLoading = (await this.loadingIndicators.count()) > 0;
    if (!isLoading && (await this.modal.isVisible())) return { status: 'blocked', message: await this.modalText() };
    return undefined;
  }

  private async modalText(): Promise<string> {
    return (await this.modal.innerText()).replace(/\s+/g, ' ').trim();
  }
}
