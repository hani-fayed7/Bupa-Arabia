# Roadmap

What has been built, in what order, and what comes next. For the current state of each feature, see [status.md](status.md).

## Guiding decisions

These shaped every milestone:
- **Never bypass the reCAPTCHA.** A person completes the verification step, and the session is reused so this happens rarely.
- **Safe by default on a live site.** The default mode applies and then withdraws, and a dry-run mode never submits. Tests run one at a time with no automatic retries.
- **Choose the job at run time.** Skip jobs already applied to. When the CV doesn't match, answer "Do not apply" and try the next job.
- **Locators a user would recognise first.** Role, label or placeholder, then stable ids and names. Never styling classes.

## Completed

### Milestone 1: Project foundation
- Typed `.env` settings with validation (`tests/utils/env.ts`) and a committed `.env.example`.
- Playwright config: a `setup` project plus a `chromium` project that reuses the saved session, the `…/en/` base URL, and traces, screenshots and videos kept on failure.
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
- Dry run verified live.
- Clean-up pass: a shared dialog helper, fewer page loads, and time limits kept next to what they depend on.

## Next

### Milestone 5: Prove the full flow live
- [ ] Run `npm test` once in `apply-withdraw` mode, triggered by the account owner.
- [ ] Adjust any locator the run shows to be wrong. The candidates are:
  - the confirmation message location
  - the withdraw confirmation
  - "Apply Now" coming back after withdrawing
  - recognising and skipping jobs with a screening questionnaire

  Results of each run are recorded in [status.md](status.md).
- [ ] Record the outcome in [status.md](status.md).

### Milestone 6: Round out the suite
- [x] Negative login checks in `tests/specs/logged-out/login.spec.ts`, run by the new `chromium-logged-out` project.
- [x] README: quick start and a "design rationale" section.
- [ ] Decide whether `searchKeyword` should become a list of keywords (data-driven runs).

## Later / optional

- **More browsers:** one setup project and auth file per browser, because the server ties the session to the user agent.
- **Session expiry:** find out how long a session lasts, and possibly warn early when the saved session is close to expiring.
- **Verification code edge cases:** expired codes, "resend code".
- **Screening questionnaires:** optionally answer them from `test-data/questionnaire-answers.json`, matching questions by their text. The answers are claims sent to a real recruiter, so this needs the account owner's explicit decision. Until then, these jobs are skipped.

## Blocked: needs the platform owner

- **Fully unattended runs (CI).** This needs a test environment where reCAPTCHA is disabled, uses Google's test keys, or allowlists a test account. Then:
  - `OtpPage.verify(code)` is already in place.
  - A code reader can be added: IMAP for a Gmail test account, or Microsoft Graph for Outlook.com.
  - The saved session could come from CI secrets.
