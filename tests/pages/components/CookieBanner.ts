import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Sticky privacy bar fixed to the bottom of every page ("I Accept").
 *
 * - Accepting slides it off-screen (it stays in the DOM with a size), so "shown" means
 *   *in the viewport*, not "visible".
 * - Consent is kept in localStorage (`talentera_privacy_policy`), which storageState saves,
 *   so it only needs accepting once per fresh (anonymous) context.
 */
export class CookieBanner {
  readonly container: Locator;
  readonly acceptButton: Locator;

  constructor(page: Page) {
    this.container = page.locator('#privacy_sticky');
    this.acceptButton = this.container.getByRole('button', { name: 'I Accept' });
  }

  async isShown(): Promise<boolean> {
    return (await this.acceptButton.isVisible()) && (await this.isInViewport());
  }

  /** Accepts the banner if it is on screen; does nothing when consent was already given. */
  async acceptIfShown(): Promise<void> {
    if (!(await this.isShown())) return;
    await this.acceptButton.click();
    await expect(this.container).not.toBeInViewport();
  }

  private async isInViewport(): Promise<boolean> {
    try {
      await expect(this.container).toBeInViewport({ timeout: 1_000 });
      return true;
    } catch {
      return false;
    }
  }
}
