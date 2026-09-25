import { expect, test } from '../../fixtures/test';
import invalidUsersJson from '../../test-data/invalid-users.json';
import { type InvalidUsersData } from '../../test-data/types';

const invalidUsers: InvalidUsersData = invalidUsersJson;

/** Negative login checks. Runs logged out, with made-up accounts only (see docs/walkthrough.md §8). */
test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('rejects an unknown account with the site error message', async ({ loginPage }) => {
    const { email, password } = invalidUsers.unknownAccount;

    await loginPage.submitCredentials(email, password);

    await expect(loginPage.errorMessage).toHaveText(
      "You've entered an incorrect email or password, please try again.",
    );
    await expect(loginPage.emailInput).toHaveValue(email);
    await expect(loginPage.passwordInput).toBeEmpty();
    expect(await loginPage.isLoggedIn()).toBe(false);
  });

  test('requires email and password before submitting', async ({ loginPage }) => {
    await loginPage.submitCredentials('', '');

    await expect(loginPage.emailError).toHaveText('This field is required');
    await expect(loginPage.passwordError).toHaveText('This field is required');
    await expect(loginPage.errorMessage).toContainText('Please fill out the highlighted fields');
    expect(await loginPage.isLoggedIn()).toBe(false);
  });
});
