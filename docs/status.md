# Status

Snapshot of where the automation stands. Last updated: **2026-09-25**.

**Scope:** the careers portal https://careers.bupa.com.sa/ only. The corporate site bupa.com.sa is out of scope.
- **Part 1:** automate the end-to-end job application flow (log in, find a job, apply), built with Playwright + TypeScript and the Page Object Model.
- **Part 2:** explore the whole portal and propose a test automation plan for it.

## Summary

- **Done and verified live:** the full flow on Chromium.
  - Login, with a person completing the verification step.
  - Session reuse.
  - Job search.
  - A real **apply → verify → withdraw** run.
  - Negative login checks.
- **Cross-browser:** Firefox and WebKit pass the login checks, and WebKit passed the real apply-withdraw run. The site keeps one active session per account, so logged-in runs on several browsers at once need one account per browser. With a single account, run one browser at a time.
- **Decided:** screening questionnaires are never answered. Jobs that need one are skipped.
- **Part 2 done:** a full tour of the careers portal and the [test automation plan](test-automation-plan.md). The tour reported 15 findings. The main ones are invalid JobPosting structured data on job pages (F1, High), several accessibility failures (F2–F5), and slow page loads (F6).

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
| Browsers | Logged-in apply flow on WebKit | Verified | real apply-withdraw run passed |
| Browsers | Logged-in apply flow on Firefox | Built | ran into the one-session-per-account rule; needs its own account or a run on its own |
| Browsers | Guard: browsers sharing one account can't run logged-in specs together | Verified | `auth.setup.ts` |
| Auth | Fail fast with an explanation when a session was ended elsewhere | Verified | `BasePage.ensureLoggedIn` |
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

## Part 2: test automation plan

| Item | Status | Where |
|---|---|---|
| Tour of careers.bupa.com.sa: public pages, search, job pages, registration and forgot-password forms (not submitted), the Arabic site, mobile, and the candidate account (read-only) | Done | method in plan section 2 |
| Accessibility (axe, WCAG 2.1 AA), load timings, security headers, robots.txt, sitemap and background-call review | Done | plan section 4 |
| Findings F1–F15, each confirmed with a second check | Reported, not yet confirmed by the platform team | plan section 4 |
| Test automation plan: scope, test types, catalogue of 38 scenarios, tooling, CI/CD, rollout | Done | [test-automation-plan.md](test-automation-plan.md) |
| Word copies of the plan and the interview prep pack | Done | outside the repo, next to the assessment folder |
| Building the plan's tests (API, accessibility, SEO, visual…) | Not started (a proposal) | plan section 12 |

## Verification evidence

- **First real `apply-withdraw` run** on Chromium (keyword "Manager"), run by the account owner: passed.
- **An earlier real run** ("Consultant") confirmed the mismatch pop-up handling. It also found the questionnaire redirect, and nothing was submitted.
- **`APPLY_MODE=dry-run npm test` on Chromium:** 4 of 4 passed (setup, 2 login checks, apply spec).
- **`BROWSERS=firefox,webkit`, logged-out projects:** 4 of 4 passed. Firefox setup without a session fails fast with a browser-specific message.
- **`SLOW_MO=500`** measurably slows the run. Invalid values are rejected.
- **First cross-browser run (all three browsers, one shared account):** 10 of 12 passed, including the WebKit apply-withdraw run. Chromium and Firefox were logged out mid-run by the later logins, which revealed the one-session-per-account rule. Firefox and WebKit logins showed no reCAPTCHA.
- **The first real login** confirmed the logged-in flag (`is_logged_1`, cookie `ISLOGGED…=1`).

## Known limitations

- **One active session per account.** Found on the first cross-browser run: logging in on Firefox, then WebKit, ended the Chromium and Firefox sessions, so only WebKit's apply run passed. Logged-in runs on several browsers together need one account per browser (`USER_EMAIL_<BROWSER>`). With a single account, run one browser at a time.
- **The verification step needs a person.** A reCAPTCHA v2 checkbox appears on every login, and the suite never automates or bypasses it. When a saved session expires, someone runs `npm run auth` again, once per browser in use.
- **Not CI-ready**, for the same reason.
- **Live data changes.** The job is chosen at run time, so which job gets applied to can differ between runs.
- **Account state:** the test account already has one application made during manual testing with "Apply anyway" (*Senior Executive Manager – Corporate Health Center Operations (Mega AC)*). It can't be withdrawn, and the suite skips it automatically.

## Open questions

1. How long does a saved session last before `npm run auth` is needed again?
2. Verification codes: how long is a code valid, and how does resending work? This isn't handled yet.
3. For Talentera: is there a test environment or account where reCAPTCHA is disabled or uses Google's test keys?
4. For Talentera, from the tour:
   - Is anonymous access to job pages intended (F11)?
   - Is the `about-us` rule in `robots.txt` intended (F10)?
   - Is there an API to seed and clean up test data? (The full list is in plan section 14.)
