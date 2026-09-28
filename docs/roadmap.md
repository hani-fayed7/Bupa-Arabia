# Roadmap

What has been built, in what order, and what comes next. For the current state of each feature, see [status.md](status.md).

## Guiding decisions

These shaped every milestone:
- **Never bypass the reCAPTCHA.** A person completes the verification step, and the session is reused so this happens rarely.
- **Safe by default on a live site.** The default mode applies and then withdraws, and a dry-run mode never submits. Tests run one at a time with no automatic retries.
- **Choose the job at run time.** Skip jobs already applied to. When the CV doesn't match, answer "Do not apply" and try the next job. Jobs that need a screening questionnaire are skipped.
- **Never send made-up claims to a recruiter.** Screening questionnaires are not answered.
- **Locators a user would recognise first.** Role, label or placeholder, then stable ids and names. Never styling classes.

## Completed

### Milestone 1: Project foundation
- Typed `.env` settings with validation (`tests/utils/env.ts`) and a committed `.env.example`.
- Playwright config: a setup project plus a logged-in project that reuses the saved session, the `…/en/` base URL, and traces, screenshots and videos kept on failure.
- npm scripts: `test`, `test:headed`, `auth`, `report`, `typecheck`.

### Milestone 2: Login page objects
- `BasePage`: safe relative navigation, spinner waits, logged-in flag.
- `CookieBanner`, `LoginPage`, `OtpPage`.
- Checked against the live site with a made-up account.

### Milestone 3: Authentication and session reuse
- `auth.setup.ts`: reuse a valid saved session. Otherwise run a headed login where a person does the verification step. When headless, fail fast.
- A reCAPTCHA was found on the verification step. The design switched from an automated code reader to a person completing the step.
- TypeScript type-checking added.

### Milestone 4: Apply flow
- `JobSearchPage`, `JobDetailsPage`, `ApplicationPage`, `MyApplicationsPage`, and shared fixtures.
- `apply-job.spec.ts`: search → apply to the first eligible job → verify → withdraw. The mode is set by `APPLY_MODE`.
- Clean-up pass: a shared dialog helper, fewer page loads, and time limits kept next to what they depend on.

### Milestone 5: Prove the full flow live
- A real run found the screening-questionnaire redirect. It led to the `questionnaire` result, and those jobs are now skipped.
- First real `apply-withdraw` run passed on Chromium: apply, confirmation, My Applications, Withdraw link, withdraw.

### Milestone 6: Round out the suite
- Negative login checks in `tests/specs/logged-out/login.spec.ts`, run by a logged-out project that needs no session.
- README with a quick start and a design-rationale section.
- Second clean-up pass: the logged-out project starts with only the cookie consent, the outcome messages carry real site data, and duplicated docs were merged.

### Milestone 7: Compatibility and demo support
- `BROWSERS` setting (chromium, firefox, webkit). Each browser gets its own setup project, session file (`playwright/.auth/<browser>.json`) and logged-out project.
- Login checks verified on Firefox and WebKit.
- `SLOW_MO` setting for demos and headed runs.
- The cross-browser run revealed the one-session-per-account rule. Added per-browser accounts (`USER_EMAIL_<BROWSER>`), a setup guard against shared accounts, and `ensureLoggedIn()` to fail fast when a session was ended.

### Milestone 8: Part 2, portal tour and test automation plan
- A full tour of **careers.bupa.com.sa** only (bupa.com.sa is out of scope), in English and Arabic, on desktop and mobile, including the candidate account (read-only).
- Technical checks: accessibility (axe), load timings, security headers, robots.txt, sitemap and background calls.
- [test-automation-plan.md](test-automation-plan.md): 15 findings, scope and priorities, test types, 38 catalogued scenarios, tooling, CI/CD and a phased rollout. There's also a Word copy outside the repo.

### Milestone 9: Part 2, formal LaTeX plan (draft)
- [latex/test-automation-plan.tex](latex/test-automation-plan.tex), a separate document from the Markdown plan. It covers:
  - the portal as a standalone web app
  - Agile practices: the testing quadrants, the test pyramid, three amigos, the definition of done
  - tools: Playwright + TypeScript with the Page Object Model, Postman/Newman for API tests (Playwright `request` only for UI test setup), Docker, GitHub Actions
  - an assumed QA environment with test hooks
- New scenario IDs: CP (CV parsing), JA (Job Alerts), SJ (Saved Jobs), CB (CV builder). The existing IDs are unchanged.

### Milestone 10: Part 2, concise plan
- [latex/test-automation-plan-concise.tex](latex/test-automation-plan-concise.tex): the required 10-section outline, in the first person, 5–7 pages.
- It includes the author's own findings on CV parsing, the verification code and Saved Jobs.
- Tools: Postman for API tests, with Playwright `request` only for UI test setup; Git; GitHub Actions, with Docker as one line in the CI section; the HTML report on every run, and Allure for nightly history.

## Next

- [x] Cross-browser run: WebKit apply flow verified. It revealed the one-session-per-account rule, so the setup now blocks shared accounts and pages detect a lost session.
- [ ] Firefox apply flow: run it on its own (`BROWSERS=firefox`), or register a second test account for `USER_EMAIL_FIREFOX`.
- [ ] Decide whether `searchKeyword` should become a list of keywords (data-driven runs).
- [ ] Formal LaTeX plan (optional, since the concise plan is the one to submit): add the author's own tour observations (CV parsing, registration and emails, Saved Jobs and Job Alerts) where it's marked `\mine{…}`, then rebuild the PDF.
- [ ] Raise the tour findings with the platform team, starting with F1 (invalid JobPosting JSON-LD) and the accessibility failures, and get answers to plan section 14.

## Towards the plan (if it's adopted)

These follow the [plan's phased rollout](test-automation-plan.md#12-phased-rollout). The first items can run read-only against production, today, in this repo:
- **API tests for job search** (plan JD-01 to JD-05), built on the `byt_job_search_manager` JSON.
- **A JSON-LD check on every job page** (plan JD-10). It would catch F1.
- **Security headers and cookie flags** (plan X-06).
- **An accessibility baseline** with `@axe-core/playwright` (plan X-01, X-02).
- **Restructure** into `tests/api`, `tests/e2e`, `tests/a11y`, `tests/seo`… (plan section 10).

## Later / optional

- **Session expiry:** find out how long a session lasts, and possibly warn early when the saved session is close to expiring.
- **Verification code edge cases:** expired codes, "resend code".

## Won't do

- **Answering screening questionnaires.** The answers would be claims about the candidate, sent to a real recruiter. Jobs that need one are skipped instead.

## Blocked: needs the platform owner

- **Fully unattended runs (CI).** This needs a test environment where reCAPTCHA is disabled, uses Google's test keys, or allowlists a test account. Then:
  - `OtpPage.verify(code)` is already in place.
  - A code reader can be added: IMAP for a Gmail test account, or Microsoft Graph for Outlook.com.
  - The saved sessions could come from CI secrets.
