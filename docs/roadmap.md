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

## Next

- [ ] Run `npm run auth` with `BROWSERS=firefox,webkit` (one human login per browser), then the apply flow on those browsers.
- [ ] Decide whether `searchKeyword` should become a list of keywords (data-driven runs).

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
