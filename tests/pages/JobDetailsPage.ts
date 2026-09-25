import { expect, type Dialog, type Locator, type Page } from '@playwright/test';
import { ApplicationPage } from './ApplicationPage';
import { BasePage } from './BasePage';

/**
 * /en/saudi-arabia/jobs/<slug>-<id>/: requires login (anonymous visits redirect to /en/login/).
 *
 * Application state is shown by which action is offered:
 * - "Apply Now"            → can apply
 * - "Withdraw Application" → applied, can withdraw
 * - neither                → applied via "Apply anyway" (cannot be withdrawn)
 */
export class JobDetailsPage extends BasePage {
  readonly title: Locator;
  /** Rendered twice (above and below the description) with the same href; either one works. */
  readonly applyNowLink: Locator;
  readonly withdrawLink: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByRole('heading', { level: 1 });
    this.applyNowLink = page.getByRole('link', { name: 'Apply Now' }).first();
    this.withdrawLink = page.getByRole('link', { name: 'Withdraw Application' }).first();
  }

  /** @param url absolute job URL, as returned by JobSearchPage.listJobs() */
  async goto(url: string): Promise<void> {
    await this.open(url);
    await expect(this.title).toBeVisible();
  }

  async canApply(): Promise<boolean> {
    return this.applyNowLink.isVisible();
  }

  async startApplication(): Promise<ApplicationPage> {
    await this.applyNowLink.click();
    await this.page.waitForURL(/\/job-application\//);
    const applicationPage = new ApplicationPage(this.page);
    await expect(applicationPage.heading).toBeVisible();
    return applicationPage;
  }

  /** Withdraw asks for confirmation with a native confirm(), which is accepted here. */
  async withdraw(): Promise<void> {
    const accept = (dialog: Dialog) => void dialog.accept();
    this.page.on('dialog', accept);
    try {
      await this.withdrawLink.click();
      await expect(this.withdrawLink).toBeHidden();
      await this.waitForLoaders();
    } finally {
      this.page.off('dialog', accept);
    }
  }
}
