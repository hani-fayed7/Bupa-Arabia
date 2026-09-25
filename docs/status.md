# Status

Snapshot of where the automation stands. Last updated: **2026-09-25**.

**Scope:** automate the end-to-end job application flow on the live portal https://careers.bupa.com.sa/: log in, find a job, apply. Built with Playwright + TypeScript, using the Page Object Model.

## Summary

- **Done:** the whole flow is built. Login (with a human-completed verification step), session reuse, job search, the application with all its outcomes, the checks, and withdrawal.
- **Verified live:** login, session reuse, the cookie banner, the wrong-password handling, and a full **dry run** (search → job → application page, no submission).
- **Not yet verified live:** a real **apply → verify → withdraw** run. It creates a real application with Bupa HR, so it only runs when the account owner triggers it.

## Features

Statuses:
- **Verified**: built and run against the live site.
- **Built**: written and type-checked, but not yet run live.
- **Planned**: not written yet.
- **Blocked**: waiting on something outside this repo.

| Area | Feature | Status | Where |
|---|---|---|---|
| Config | `.env` loading and validation, apply modes | Verified | `tests/utils/env.ts`, `.env.example` |
| Config | Strict type-check (`npm run typecheck`) | Verified | `tsconfig.json` |
| Config | Logged-out project that runs without setup (works with an expired session) | Verified | `playwright.config.ts` |
| Auth | Email + password login, fail-fast on rejected credentials | Verified | `LoginPage` |
| Auth | Verification step (reCAPTCHA + emailed code) completed by a person in a headed run | Verified | `OtpPage.completeByHand`, `auth.setup.ts` |
| Auth | Saved-session reuse and re-validation (~3s, no login) | Verified | `auth.setup.ts` |
| Auth | Fail-fast when headless with no valid session | Verified | `auth.setup.ts` |
| Auth | Fully automated verification code (`OtpPage.verify(code)`) | Blocked | Needs a test account without reCAPTCHA |
| Site | Cookie banner accept (persists through the saved session) | Verified | `CookieBanner` |
| Site | Spinner / loading-overlay waits | Verified | `BasePage.waitForLoaders` |
| Search | Keyword search through the UI, list job cards | Verified (dry run) | `JobSearchPage` |
| Job | Detect "can apply" vs "already applied" | Verified (dry run) | `JobDetailsPage.canApply` |
| Apply | Open the application page for a job | Verified (dry run) | `JobDetailsPage.startApplication` |
| Apply | Submit and classify the outcome: submitted, CV mismatch, screening questionnaire, blocked (incl. native alert) | Built (mismatch verified live) | `ApplicationPage.submit` |
| Apply | Decline the mismatch warning and try the next job (max `MAX_JOB_ATTEMPTS` submissions) | Verified | `apply-job.spec.ts` |
| Apply | Skip jobs that require a screening questionnaire (never answered automatically) | Built | `apply-job.spec.ts` |
| Apply | Answer screening questionnaires from test data | Planned (needs the account owner's decision) | not started |
| Verify | Confirmation message, "Withdraw Application" on the job page, entry in My Applications | Built | `apply-job.spec.ts` |
| Clean-up | Withdraw the application (accepts the native `confirm()`) | Built | `JobDetailsPage.withdraw` |
| Negative | Unknown account → site error message, still logged out | Verified | `tests/specs/logged-out/login.spec.ts` |
| Negative | Empty fields → "This field is required" (checked in the browser) | Verified | `tests/specs/logged-out/login.spec.ts` |
| Browsers | Firefox / WebKit projects | Planned | needs one setup project + auth file per browser |

## Verification evidence

- `npm run typecheck`: clean.
- `APPLY_MODE=dry-run npm test`: 4 passed (setup, 2 login checks, apply spec) in about 20s.
- First real login with `npm run auth` confirmed the logged-in flag (`is_logged_1`, cookie `ISLOGGED…=1`).
- Throwaway live checks with a made-up account passed: the cookie banner is shown, then accepted and stays accepted; the wrong-password error appears; `login()` fails fast.

## Known limitations

- **The verification step needs a person.** A reCAPTCHA v2 checkbox appears on every login. The suite never automates or bypasses it. Once the saved session expires, someone runs `npm run auth` again.
- **Not CI-ready**, for the same reason. The saved session is also tied to the browser's user agent.
- **Live data changes.** The job is chosen at run time, so which job gets applied to can differ between runs.
- **Account state:** the test account already has one application made during manual testing with "Apply anyway" (*Senior Executive Manager – Corporate Health Center Operations (Mega AC)*). It can't be withdrawn, and the suite skips it automatically.

## Open questions

1. The first real apply run still has items to confirm: see the checklist in [roadmap.md, Milestone 5](roadmap.md#milestone-5-prove-the-full-flow-live).

   The mismatch pop-up buttons were confirmed on the first real run (2026-09-25). That run also found the questionnaire case, which led to the `questionnaire` result.
2. How long does a saved session last before `npm run auth` is needed again?
3. Verification codes: how long is a code valid, and how does resending work? This isn't handled yet.
4. For Talentera: is there a test environment or account where reCAPTCHA is disabled or uses Google's test keys?
