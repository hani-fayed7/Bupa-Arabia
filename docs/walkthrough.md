# Walkthrough

How this project is set up, how it's organised, and the conventions the code follows. Read this before changing or extending the suite.

## 1. Getting started

```bash
npm install
npx playwright install chromium
cp .env.example .env          # then fill in USER_EMAIL and USER_PASSWORD
npm run auth                  # headed login: tick "I'm not a robot", type the emailed code, click Verify
npm test                      # reuses the saved session; default mode applies, verifies, then withdraws
```

**Settings** (`.env`; a value set in the shell always wins over the file):

| Variable | Meaning |
|---|---|
| `BASE_URL` | Site root including the language, `https://careers.bupa.com.sa/en/`. Keep the trailing slash. |
| `USER_EMAIL`, `USER_PASSWORD` | Test account. It needs a CV on file. |
| `APPLY_MODE` | `apply-withdraw` (default), `dry-run` (never submits), or `apply` (keeps the application). |
| `MAX_JOB_ATTEMPTS` | How many jobs to try when the site says the CV doesn't match (default 5). |

**Everyday commands:**

| Command | What it does |
|---|---|
| `npm test` | Setup (re-validates the saved session, about 3s) and then all specs |
| `APPLY_MODE=dry-run npm test` | Whole flow up to the application page, without submitting |
| `npx playwright test -g "can apply"` | One test, by title |
| `npm run test:headed` | Same as `npm test`, in a visible browser |
| `npm run typecheck` | Strict TypeScript check. Playwright itself never checks types. |
| `npm run report` | HTML report. Failed tests keep a trace, a screenshot and a video. |

## 2. Project structure

```
playwright.config.ts   projects: setup → chromium (reuses playwright/.auth/user.json)
                                 chromium-logged-out (no session, no setup)
tests/
  specs/               what is tested: auth.setup.ts, apply-job.spec.ts
    logged-out/        specs that must start without a session (login.spec.ts)
  pages/               how to use each page: page objects extending BasePage
    components/        pieces shared by every page (CookieBanner)
  fixtures/test.ts     hands page objects to specs
  test-data/           non-secret JSON (+ types.ts for its shape)
  utils/env.ts         the only place that reads environment variables
playwright/.auth/      saved session (gitignored)
```

Each layer has one job:
- **Specs** decide *what* to check and make the assertions.
- **Page objects** know *how* to use a page: locators, actions, and waiting for the state the next step needs.
- **Fixtures** create the page objects.
- **env.ts** owns configuration.
- **Test data** holds inputs only. Secrets are never kept in the JSON files.

## 3. How a run works

```
npm test
 └─ project "setup"  (tests/specs/auth.setup.ts)
      ├─ load playwright/.auth/user.json if it exists
      ├─ open the home page: logged in?  → yes: re-save the session, done
      ├─ headless?                       → fail: "run npm run auth first"
      └─ headed: log in → a person completes reCAPTCHA + code → save the session
 └─ project "chromium-logged-out"  (no setup, no session)
      └─ logged-out/login.spec.ts: unknown account → site error; empty fields → "This field is required"
 └─ project "chromium"  (depends on setup, starts from the saved session)
      └─ apply-job.spec.ts
           1. search jobs for the keyword in test-data/jobs.json
           2. for each result: skip if already applied → open the application page
              → dry-run: stop here
              → submit: submitted? done | CV mismatch? "Do not apply", try the next job
                        | questionnaire? leave it unanswered, try the next job
           3. check My Applications, then check the job page offers "Withdraw Application"
           4. apply-withdraw mode: withdraw, and check "Apply Now" is back
```

**Why the login needs a person.** Every login ends with a reCAPTCHA checkbox and a 4-digit code sent by email. The suite deliberately never automates or bypasses the CAPTCHA. Instead, a person completes it once, and every later run reuses the saved session. `OtpPage.verify(code)` is ready for a test environment where the CAPTCHA is turned off.

## 4. Writing page objects

**The pattern.** Locators are `readonly` fields set in the constructor. Methods describe what a user does:

```ts
export class JobDetailsPage extends BasePage {
  readonly applyNowLink: Locator;

  constructor(page: Page) {
    super(page);
    this.applyNowLink = page.getByRole('link', { name: 'Apply Now' }).first();
  }

  async startApplication(): Promise<ApplicationPage> {
    await this.applyNowLink.click();
    await this.page.waitForURL(/\/job-application\//);
    const applicationPage = new ApplicationPage(this.page);
    await expect(applicationPage.heading).toBeVisible();
    return applicationPage;
  }
}
```

**The rules:**
- **Methods describe intent** (`startApplication`, `withdraw`), not raw clicks.
- **A step that lands on a new page returns that page object.** For example, `LoginPage.login()` returns an `OtpPage`, and `JobDetailsPage.startApplication()` returns an `ApplicationPage`.
- **Page objects wait; specs assert.** A page object may use `expect(...)` to wait for the state the next step depends on. Checking business outcomes belongs to the spec.
- **When the site can respond in several ways, return the outcome instead of guessing.** For example, `ApplicationPage.submit()` returns `submitted | mismatch | questionnaire | blocked` with the site's message, and the spec decides what to do next.
- **Navigate with `this.open('path/')`:** relative, with no leading slash. `/login/` would drop the `/en` language prefix, so `open()` rejects it.
- **Handle native `alert()`/`confirm()` with `withDialogHandler()`** from `BasePage`. It removes the handler afterwards, so it can't answer a later dialog.
- **Explain site behaviour in comments.** A comment above a locator or method explains *why*: a site quirk, or a choice that isn't obvious.

## 5. Choosing locators

Try these in order:

1. **What a user sees:** `getByRole`, `getByLabel`, `getByPlaceholder`, `getByAltText`.
2. **Stable form hooks the server sets:** `#loginBtn`, `#default-login`, `input[name=…]`.
3. **Text, scoped inside a container.**
4. **Named components when nothing else identifies them:** `.job-card`, `#privacy_sticky`.

**Never** use styling classes (`grid-10`, `margin_top_10`), position-based XPath, or URLs that carry a session token (`?token=…`).

When the site shows the same control twice with the same target, such as the two "Apply Now" links, use `.first()` with a comment saying why.

## 6. Waiting

- **Wait for the state you need next, not for time to pass.** Use web-first assertions such as `expect(locator).toBeVisible()` and `page.waitForURL(...)`. `waitForTimeout` is never used.
- **Never wait for `networkidle`.** Google Analytics and Hotjar keep sending requests, so the network never goes quiet.
- **Spinners:** every spinner on the site is an image with alt text "Loading...", so `BasePage.waitForLoaders()` covers them all. Use it after the action that shows a spinner, together with a wait for the end state.
- **Don't use `#modaloverlay`/`#modalpopup` as a loading signal.** Every pop-up uses them, including real dialogs.
- **Logged in:** the server marks `<body>` with `is_logged_1`. `waitForLoggedIn()` survives the redirects after login.

## 7. Site behaviour to know

| Behaviour | Consequence in the code |
|---|---|
| Job pages redirect to login when you're not logged in | Every spec depends on the `setup` project |
| The session is tied to the browser's user agent | All contexts use `devices['Desktop Chrome']`. Another browser needs its own setup project and auth file. |
| Accepting the cookie banner slides it off-screen, and consent is kept in localStorage | `acceptIfShown()` checks the viewport (after a short slide-in window). The saved session keeps the consent. |
| "Apply Now" leads to a separate page, `/job-application/?jb_id=…` | `ApplicationPage` is a page, not a pop-up |
| Submitting runs a pre-check first | The result can be a submission, a CV-mismatch pop-up, a redirect to a screening questionnaire (`/answersheet/`, nothing is submitted until it's answered), an eligibility pop-up, or an `alert()` |
| Withdrawing asks with a native `confirm()` | `withdraw()` accepts it through `withDialogHandler()` |
| Jobs applied with "Apply anyway" show neither Apply Now nor Withdraw | "Can apply" means the Apply Now link is visible |

## 8. Extending the suite

**A new page:**
1. Create `tests/pages/XPage.ts` extending `BasePage`. Put locators in the constructor and add a `goto()` that uses `this.open('path/')`.
2. If a spec starts from it, add a fixture in `tests/fixtures/test.ts`.
3. Import `test`/`expect` from `../fixtures/test` in the spec, not from `@playwright/test`.

**A new spec:**
- **Needs to be logged in:** put it in `tests/specs/*.spec.ts`. It runs in the `chromium` project, which depends on `setup` and starts from the saved session.
- **Must start logged out** (such as a wrong-password check): put it in `tests/specs/logged-out/`. It runs in `chromium-logged-out`, with no session and no setup. It still runs when the saved session has expired, and it can never trigger the verification step. Use made-up accounts only: failed logins against the real account could lock it.

**New test data:** add a JSON file under `tests/test-data/` and describe its shape in `types.ts`.

## 9. Debugging

- **Failed runs:** run `npm run report` and open the failed test's **trace**. It shows every step, a DOM snapshot, network calls and console output. Steps in `apply-job.spec.ts` are named with `test.step`, so the report reads like the scenario.
- **Step through by hand:** use `npx playwright test --headed --debug`, or add `await page.pause()` where you want to stop.
- **Selectors:** `npx playwright codegen https://careers.bupa.com.sa/en/login/` helps explore them. Rewrite its output to follow section 5 before adding it to a page object.
- **"No valid saved session":** run `npm run auth`.
- **Poking at logged-in pages from a script:** load `playwright/.auth/user.json` into a `Desktop Chrome` context. Don't log in again, because extra logins mean extra CAPTCHAs.
