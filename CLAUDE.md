# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A technical assessment for Talentera (Bayt.com), about the **live** careers portal https://careers.bupa.com.sa/ (a Talentera deployment). **Scope is the careers portal only.** The corporate site bupa.com.sa is out of scope.
- **Part 1 (the code):** Playwright + TypeScript end-to-end automation of logging in, then searching for a job, applying, verifying and withdrawing. The Page Object Model is used throughout.
- **Part 2 (a document):** [docs/latex/test-automation-plan.tex](docs/latex/test-automation-plan.tex) is the only plan and the version to submit. It has a cover page, a contents page and a body of about 6 pages, in the required 10-section outline. The earlier Markdown plan and the longer formal draft were removed.
  - It's written strictly in the author's first person, so keep it that way in every edit.
  - Its CV parsing, verification-code and Saved Jobs observations are the author's real data. Don't change them without the author's input.
  - The invalid JobPosting JSON-LD finding was deliberately removed from it. Don't add it back.

Clear, defensible design matters as much as passing tests.

## Commands

```bash
npm run auth                      # headed login; a person solves reCAPTCHA + types the emailed code → saves playwright/.auth/<browser>.json (one per browser in BROWSERS)
npm test                          # setup-<browser> projects (validate saved sessions, ~3s) + all specs
npm run typecheck                 # tsc --noEmit; Playwright itself never type-checks
npm run report                    # open the last HTML report (traces/videos kept on failure)

npx playwright test apply-job.spec.ts            # single spec file (setup runs first as a dependency)
npx playwright test -g "can apply"               # single test by title
APPLY_MODE=dry-run npx playwright test           # no submission; shell env overrides .env
npx playwright test --project='setup-*'          # just re-validate the saved session(s)
BROWSERS=chromium,firefox,webkit npm test        # cross-browser run: needs one account per browser (USER_EMAIL_<BROWSER>) + each browser's `npm run auth`
SLOW_MO=500 npm run test:headed                  # slowed-down visible run for demos
```

Config comes from `.env` (copy `.env.example`): `USER_EMAIL`, `USER_PASSWORD` (optionally per browser: `USER_EMAIL_<BROWSER>`), `BROWSERS`, `SLOW_MO`, `APPLY_MODE` (`apply-withdraw` default | `dry-run` | `apply`), `MAX_JOB_ATTEMPTS`, `BASE_URL`. `tests/utils/env.ts` is the only place that reads them. It validates lazily, through getters.

## Architecture

- `tests/specs/`: `testDir`. The config builds three projects for each browser in `BROWSERS` (default `chromium`). The server ties a session to the user agent, so each browser has its own session file, `authFile(browser)` → `playwright/.auth/<browser>.json`.
  - `setup-<browser>` runs `auth.setup.ts`, which picks the file and the account (`env.credentials(browser)`) via the `browserName` fixture.
  - `<browser>` runs the logged-in specs, with `dependencies: ['setup-<browser>']` and that browser's session.
  - `<browser>-logged-out` runs `tests/specs/logged-out/**`, with no session and no setup dependency, starting with only the cookie consent in localStorage (e.g. negative login checks, which must use made-up accounts, never the real one).
- `tests/pages/`: page objects extending `BasePage`. Locators are `readonly` fields set in the constructor. Methods express intent. POMs may use web-first `expect` to *wait* for state, but business assertions live in specs. Pages reached only through a flow are returned by the step that opens them (`LoginPage.login()` → `OtpPage`, `JobDetailsPage.startApplication()` → `ApplicationPage`). The rest are injected via `tests/fixtures/test.ts`, so specs import `test`/`expect` from there, not from `@playwright/test`.
- `tests/test-data/`: non-secret JSON, typed by `types.ts`. Credentials only come from `.env`.

### Authentication (the core constraint)
Login = email/password (full-page form POST) → verification step with a **reCAPTCHA v2 checkbox + 4-digit emailed code, on every login**. The CAPTCHA is deliberately never automated. `auth.setup.ts` works like this:
- It reuses and re-saves a valid saved session.
- Otherwise, in a headed run, it logs in and waits (≤4 min) for a human to finish verification.
- Headless with no valid session, it fails fast, telling you to run `npm run auth`.

`OtpPage` has no method to enter the code yet: it was removed while unused. Add one (fill the code, click Verify) when a CAPTCHA-free test account exists.

Login state is the server-rendered `<body>` class `is_logged_1` / `is_logged_0` (plus cookie `ISLOGGED1975069`). See `BasePage.isLoggedIn()`/`waitForLoggedIn()`.

### Site behaviour the code relies on
- **baseURL is `…/en/` with a trailing slash.** Page paths must be relative with no leading slash (`open('login/')`). A leading slash drops `/en`, so `BasePage.open()` rejects it.
- **One active session per account.** A new login (another browser, or the website) ends the previous session. `auth.setup.ts` refuses to run when selected browsers share an account. Use `USER_EMAIL_<BROWSER>` / `USER_PASSWORD_<BROWSER>`, or one browser at a time. Logged-in pages call `BasePage.ensureLoggedIn()` to fail fast. Firefox and WebKit logins showed no reCAPTCHA; Chromium did.
- **The session is bound to the user agent.** Any browser context, including ad-hoc probe scripts, must use the same device profile as the browser that saved the session: `Desktop Chrome` for `chromium.json`, `Desktop Firefox` for `firefox.json`, `Desktop Safari` for `webkit.json`. Otherwise the session is treated as anonymous.
- **Anonymous access to job pages is inconsistent:** a 302 to `/en/login/` at first, a 200 later. Anonymous job pages still show "Apply Now", so logged-in state must be checked (`ensureLoggedIn()`), not inferred from the page content. `/job-application/` always requires login.
- **Loaders:** every spinner is an `<img alt="Loading...">`, so `BasePage.waitForLoaders()` uses `getByAltText(/^Loading/)`. `#modaloverlay`/`#modalpopup` (jQuery SimpleModal) are shared by *all* pop-ups, so don't use them as a "loading" signal. Never use `networkidle` (Google Analytics and Hotjar keep firing).
- **Cookie banner** (`#privacy_sticky`): accepting only slides it off-screen, and consent lives in localStorage (saved in storageState). Use `acceptIfShown()` (a viewport check), not `addLocatorHandler`.
- **Stack:** a legacy jQuery/server-rendered stack with Vue-rendered job lists. Utility CSS classes (`grid-10`, `margin_*`) are unstable, so never locate by them. Locator priority: role/label/placeholder → stable ids/names → scoped text. `.job-card`, `#default-login` and `#loginBtn` are acceptable component/form hooks.
- **Apply flow:** job page "Apply Now" is a link (rendered twice) to a separate page `/en/job-application/?jb_id=<id>`. Its "Apply Now" button runs a pre-check first. `ApplicationPage.submit()` returns `submitted | mismatch | questionnaire | blocked`:
  - mismatch: pop-up "Apply anyway"/"Do not apply"
  - questionnaire: redirect to `/en/answersheet/`, and the application is only submitted after it
  - blocked: eligibility pop-ups, or a native `alert()` for an incomplete CV

  The spec never answers questionnaires (the account owner's decision): answers would be claims sent to a real recruiter.
- **Withdraw** uses a native `confirm()`, accepted inside `JobDetailsPage.withdraw()` via a scoped `page.on/off('dialog')`.
- **Applied state:** jobs applied via "Apply anyway" show neither Apply Now nor Withdraw, so "can apply" means the Apply Now link is visible.

## Working on the live site

- Real applications reach Bupa HR. Run non-dry-run applies only when the user asks. Use `APPLY_MODE=dry-run` to check changes to the apply flow.
- Avoid repeated or failed logins: they risk extra CAPTCHA friction, and a new login ends the saved session (one session per account). Probe logged-in pages by loading a saved `playwright/.auth/<browser>.json` into a context with that browser's device profile. Keep probes read-only: no saving, applying, editing or logging out.
- `workers: 1`, `retries: 0` on purpose: one real account, and a real side effect on every run.

## Docs

- `docs/status.md`, `docs/roadmap.md` and `docs/walkthrough.md` describe the current state, the milestones and the conventions. `docs/latex/test-automation-plan.tex` is the part 2 deliverable.
- **Whenever behaviour, commands, settings or findings change, update those docs and this file in the same change.** The user expects the docs to stay current without being reminded.
- The current interview guide is `Interview-Preparation-Guide-Bupa.docx`, with a PDF copy, in the `Technical Assessment` folder outside the repo. It covers Part 1 (the code) and Part 2 (the plan).
  - It's generated from Markdown, so when the code or the plan changes, update the guide in the same change.
  - The older `Interview-Prep-Bupa-Automation` pack is out of date.
- The LaTeX plan compiles with MiKTeX: run `pdflatex test-automation-plan.tex` twice, so the table of contents fills in.
  - MiKTeX's "unsupported Windows" line is only a warning.
  - Don't load `xcolor` with the `[table]` option: the installed `colortbl` is newer than `array` and breaks `tabularx`.
  - The build files and the PDF in `docs/latex/` are gitignored. A copy of the PDF goes to the `Technical Assessment` folder, as `Test-Automation-Plan-Bupa-Concise.pdf`.
