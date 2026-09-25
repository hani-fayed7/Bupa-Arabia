# Status

Snapshot of where the automation stands. Last updated: **2026-09-25**.

**Scope:** automate the end-to-end job application flow on the live portal https://careers.bupa.com.sa/: log in, find a job, apply. Built with Playwright + TypeScript, using the Page Object Model.

## Summary

- **Done and verified live:** the full flow on Chromium.
  - Login, with a person completing the verification step.
  - Session reuse.
  - Job search.
  - A real **apply → verify → withdraw** run.
  - Negative login checks.
- **Cross-browser:** Firefox and WebKit are supported. Their logged-out login checks pass. Their logged-in runs need one `npm run auth` login per browser first.
- **Decided:** screening questionnaires are never answered. Jobs that need one are skipped.

## Features

Statuses:
- **Verified**: built and run against the live site.
- **Built**: written and type-checked, but not yet run live.
- **Planned**: not written yet.
- **Blocked**: waiting on something outside this repo.
- **Won't do**: decided against.

| Area | Feature | Status | Where |
|---|---|---|---|
| Config | `.env` loading and validation, apply modes | Verified | `tests/utils/env.ts`, `.env.example` |
| Config | Strict type-check (`npm run typecheck`) | Verified | `tsconfig.json` |
| Config | Logged-out projects that run without setup (work with an expired session) | Verified | `playwright.config.ts` |
| Config | `SLOW_MO` to slow every action down for demos | Verified | `playwright.config.ts` |
| Browsers | Projects per browser from `BROWSERS` (chromium, firefox, webkit), each with its own session file | Verified | `playwright.config.ts` |
| Browsers | Login checks on Firefox and WebKit | Verified | `*-logged-out` projects |
| Browsers | Logged-in apply flow on Firefox and WebKit | Built | needs `npm run auth` once per browser |
| Auth | Email + password login, fail-fast on rejected credentials | Verified | `LoginPage` |
| Auth | Verification step (reCAPTCHA + emailed code) completed by a person in a headed run | Verified | `OtpPage.completeByHand`, `auth.setup.ts` |
| Auth | Saved-session reuse and re-validation (~3s, no login) | Verified | `auth.setup.ts` |
| Auth | Fail-fast when headless with no valid session | Verified | `auth.setup.ts` |
| Auth | Fully automated verification code (`OtpPage.verify(code)`) | Blocked | Needs a test account without reCAPTCHA |
| Site | Cookie banner accept (persists through the saved session) | Verified | `CookieBanner` |
| Site | Spinner / loading-overlay waits | Verified | `BasePage.waitForLoaders` |
| Search | Keyword search through the UI, list job cards | Verified | `JobSearchPage` |
| Job | Detect "can apply" vs "already applied" | Verified | `JobDetailsPage.canApply` |
| Apply | Open the application page and submit | Verified | `JobDetailsPage.startApplication`, `ApplicationPage.submit` |
| Apply | Decline the mismatch warning and try the next job (max `MAX_JOB_ATTEMPTS` submissions) | Verified | `apply-job.spec.ts` |
| Apply | Skip jobs that require a screening questionnaire | Built (the redirect was seen live, and it's detected by URL) | `ApplicationPage.readOutcome` |
| Apply | Answer screening questionnaires | Won't do: answers would be claims sent to a real recruiter | none |
| Verify | Confirmation message, entry in My Applications, "Withdraw Application" on the job page | Verified | `apply-job.spec.ts` |
| Clean-up | Withdraw the application (accepts the native `confirm()`) | Verified | `JobDetailsPage.withdraw` |
| Negative | Unknown account → site error message, still logged out | Verified | `tests/specs/logged-out/login.spec.ts` |
| Negative | Empty fields → "This field is required" (checked in the browser) | Verified | `tests/specs/logged-out/login.spec.ts` |

## Verification evidence

- **First real `apply-withdraw` run** on Chromium (keyword "Manager"), run by the account owner: passed.
- **An earlier real run** ("Consultant") confirmed the mismatch pop-up handling. It also found the questionnaire redirect, and nothing was submitted.
- **`APPLY_MODE=dry-run npm test` on Chromium:** 4 of 4 passed (setup, 2 login checks, apply spec).
- **`BROWSERS=firefox,webkit`, logged-out projects:** 4 of 4 passed. Firefox setup without a session fails fast with a browser-specific message.
- **`SLOW_MO=500`** measurably slows the run. Invalid values are rejected.
- **The first real login** confirmed the logged-in flag (`is_logged_1`, cookie `ISLOGGED…=1`).

## Known limitations

- **The verification step needs a person.** A reCAPTCHA v2 checkbox appears on every login, and the suite never automates or bypasses it. When a saved session expires, someone runs `npm run auth` again, once per browser in use.
- **Not CI-ready**, for the same reason.
- **Live data changes.** The job is chosen at run time, so which job gets applied to can differ between runs.
- **Account state:** the test account already has one application made during manual testing with "Apply anyway" (*Senior Executive Manager – Corporate Health Center Operations (Mega AC)*). It can't be withdrawn, and the suite skips it automatically.

## Open questions

1. How long does a saved session last before `npm run auth` is needed again?
2. Verification codes: how long is a code valid, and how does resending work? This isn't handled yet.
3. For Talentera: is there a test environment or account where reCAPTCHA is disabled or uses Google's test keys?
