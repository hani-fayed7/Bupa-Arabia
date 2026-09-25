import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface JobSummary {
  title: string;
  /** Absolute job details URL, e.g. …/en/saudi-arabia/jobs/<slug>-<id>/ */
  url: string;
}

/**
 * /en/job-search-results/: Vue-rendered list of job cards (10 per page).
 * Searching updates the URL: ?keyword=<kw>&sort=22,d&page=1.
 */
export class JobSearchPage extends BasePage {
  readonly keywordInput: Locator;
  /** No role or test id exists for a card; `.job-card` is the component's own name, not a styling class. */
  readonly jobCards: Locator;

  constructor(page: Page) {
    super(page);
    this.keywordInput = page.getByPlaceholder('Job title, skills, etc..');
    this.jobCards = page.locator('.job-card');
  }

  async goto(): Promise<void> {
    await this.open('job-search-results/');
    await this.waitForResults();
  }

  async search(keyword: string): Promise<void> {
    await this.keywordInput.fill(keyword);
    await this.keywordInput.press('Enter');
    await this.page.waitForURL((url) => url.searchParams.get('keyword') === keyword);
    await this.waitForResults();
  }

  /** Title and details URL of every job card on the current results page, in display order. */
  async listJobs(): Promise<JobSummary[]> {
    return this.jobCards
      .getByRole('heading', { level: 3 })
      .getByRole('link')
      .evaluateAll((links) =>
        (links as HTMLAnchorElement[]).map((link) => ({ title: link.innerText.trim(), url: link.href })),
      );
  }

  private async waitForResults(): Promise<void> {
    await this.waitForLoaders();
    await expect(this.jobCards.first()).toBeVisible();
  }
}
