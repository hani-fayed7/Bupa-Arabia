import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** /en/my-applications/: one fieldset per application (Recent Application / Company Name / Application Date). */
export class MyApplicationsPage extends BasePage {
  readonly heading: Locator;
  readonly applications: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'My Applications', level: 1 });
    this.applications = page
      .getByRole('group')
      .filter({ has: page.getByRole('heading', { name: 'Recent Application:' }) });
  }

  async goto(): Promise<void> {
    await this.open('my-applications/');
    await this.ensureLoggedIn();
    await expect(this.heading).toBeVisible();
  }

  application(jobTitle: string): Locator {
    return this.applications.filter({ has: this.page.getByText(jobTitle, { exact: true }) });
  }
}
