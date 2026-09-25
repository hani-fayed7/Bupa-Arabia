import { BasePage } from './BasePage';

/** Portal landing page (baseURL itself). Used to check whether a saved session is still valid. */
export class HomePage extends BasePage {
  async goto(): Promise<void> {
    await this.open('./');
  }
}
