import { expect, type Locator, type Page } from '@playwright/test';
import { CookieBanner } from './components/CookieBanner';

/**
 * Shared behaviour for every page on the portal.
 *
 * Page objects hold locators and intent methods. They may use web-first `expect` to *wait*
 * for a state the next step depends on; verifying business outcomes is left to the specs.
 */
export abstract class BasePage {
  readonly cookieBanner: CookieBanner;
  /**
   * Every spinner on the site (the full-page loading modal and the inline section loaders)
   * is an image with alt text "Loading...", so one user-facing locator covers them all.
   */
  readonly loadingIndicators: Locator;
  /** The server renders `is_logged_0` / `is_logged_1` on <body>: the site's own auth flag. */
  private readonly body: Locator;

  constructor(readonly page: Page) {
    this.cookieBanner = new CookieBanner(page);
    this.loadingIndicators = page.getByAltText(/^Loading/).filter({ visible: true });
    this.body = page.locator('body');
  }

  /**
   * Navigates relative to baseURL (…/en/). A leading slash would resolve against the domain
   * root and silently drop the language prefix, so it is rejected.
   */
  protected async open(path: string): Promise<void> {
    if (path.startsWith('/')) {
      throw new Error(`Use a path relative to baseURL without a leading slash, got "${path}".`);
    }
    await this.page.goto(path);
  }

  /**
   * Waits until no spinner is visible. Only reliable *after* the spinner has had a chance to
   * appear, so pair it with waiting for the expected end state rather than using it alone.
   */
  async waitForLoaders(): Promise<void> {
    await expect(this.loadingIndicators).toHaveCount(0);
  }

  async isLoggedIn(): Promise<boolean> {
    const classes = (await this.body.getAttribute('class')) ?? '';
    return /\bis_logged_1\b/.test(classes);
  }

  /** Waits for the server-rendered logged-in flag (survives the redirects after login). */
  async waitForLoggedIn(options?: { timeout?: number }): Promise<void> {
    await expect(this.body).toHaveClass(/\bis_logged_1\b/, options);
  }
}
