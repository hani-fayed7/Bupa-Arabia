import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { JobDetailsPage } from '../pages/JobDetailsPage';
import { JobSearchPage } from '../pages/JobSearchPage';
import { LoginPage } from '../pages/LoginPage';
import { MyApplicationsPage } from '../pages/MyApplicationsPage';

type PageObjects = {
  homePage: HomePage;
  loginPage: LoginPage;
  jobSearchPage: JobSearchPage;
  jobDetailsPage: JobDetailsPage;
  myApplicationsPage: MyApplicationsPage;
};

/**
 * Specs import `test`/`expect` from here and receive ready page objects as fixtures,
 * instead of constructing them with `new XPage(page)` in every test.
 * Pages reached only through a flow (OtpPage, ApplicationPage) are returned by the step that opens them.
 */
export const test = base.extend<PageObjects>({
  homePage: async ({ page }, use) => use(new HomePage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  jobSearchPage: async ({ page }, use) => use(new JobSearchPage(page)),
  jobDetailsPage: async ({ page }, use) => use(new JobDetailsPage(page)),
  myApplicationsPage: async ({ page }, use) => use(new MyApplicationsPage(page)),
});

export { expect } from '@playwright/test';
