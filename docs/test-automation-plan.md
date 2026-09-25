# Test Automation Plan: careers.bupa.com.sa

A plan for testing the whole candidate portal, not only the apply flow automated in part 1. It is based on a full tour of the live site on 2026-09-25.

**Contents**
1. [Summary](#1-summary)
2. [How the site was explored](#2-how-the-site-was-explored)
3. [What the site is made of](#3-what-the-site-is-made-of)
4. [Findings from the tour](#4-findings-from-the-tour)
5. [Scope and priorities](#5-scope-and-priorities)
6. [Test strategy: which test types, and why](#6-test-strategy-which-test-types-and-why)
7. [Test catalogue](#7-test-catalogue)
8. [Environments and test data](#8-environments-and-test-data)
9. [Tooling](#9-tooling)
10. [Framework structure](#10-framework-structure)
11. [Execution and CI/CD](#11-execution-and-cicd)
12. [Phased rollout](#12-phased-rollout)
13. [Risks and mitigations](#13-risks-and-mitigations)
14. [What I'd need from the platform team](#14-what-id-need-from-the-platform-team)

---

## 1. Summary

The portal is a Talentera deployment with three layers:
- **A legacy server-rendered UI:** jQuery pages, with the job lists rendered by Vue.
- **A JSON layer behind it:** endpoints under `/app/control/byt_*_manager`.
- **Two languages:** English and Arabic (RTL).

Real candidates use it to find jobs and apply, so the biggest risks are:
- a candidate who can't sign in or apply
- wrong or missing job data
- job listings that don't reach search engines
- candidates with disabilities who can't use the site

**Recommendations:**
1. **Test data through the API first.** Search, pagination, filters and job details come from a JSON endpoint. API tests cover them faster and more thoroughly than the UI can.
2. **Keep UI end-to-end tests to a small set of critical journeys,** built on the framework from part 1: Page Object Model, sessions per browser, and results reported as outcomes.
3. **Add accessibility, SEO and visual checks to the same Playwright suite.** The tour found real defects in all three.
4. **Run the full suite on a QA environment.** Production gets only read-only monitoring, plus apply-and-withdraw on a designated test job.
5. **Unblock automation with a few changes from the platform team** (section 14): CAPTCHA test keys, seeded accounts, stable test ids and test job postings.

---

## 2. How the site was explored

- **Coverage:**
  - every page linked from the navigation and footer
  - job search: keywords, filters, sorting, pagination, empty results, odd input
  - job pages and advanced search
  - registration and forgot-password (inspected, not submitted)
  - the Arabic site, and mobile (iPhone 13)
  - every area of the candidate account
- **Tools:** Playwright scripts, both anonymous and signed in with a saved session, plus manual checks.
- **Safe on a live site:** the account tour was read-only. It opened pages and listed what they offer, without saving, applying, editing or logging out. Negative checks used made-up data.
- **Technical checks:**
  - accessibility with axe-core (WCAG 2.1 A/AA) on 6 key pages
  - load timings from the browser's Navigation Timing API
  - HTTP security headers, `robots.txt` and the sitemap
  - console errors and failed requests
  - the background (AJAX) calls behind each page
- **Also used:** what part 1 taught about sign-in, sessions and the apply flow.

---

## 3. What the site is made of

| Area | Pages and features | Notes |
|---|---|---|
| **Public content** | Home, About Us (Values, Impact & Growth, Diversity & Culture), Hiring Process, Training Programs, FAQ, Privacy Policy | Built from a CMS, and mostly static |
| **Job discovery** | Search results, with 8 filter groups (Location, City, Job Role, Industry, Posted Date, Career Level, Employment Status, Employment Type), 4 sort options and 10 results per page. Also Advanced Search (keyword with a match mode, location, role, category, date, salary range, currency, gender, company type, timing, employment type), job details, similar jobs | Search runs on `GET /app/control/byt_job_search_manager` (JSON `{totalJobs, currentPage, view, jobs, cluster}`) |
| **Identity** | Registration (a CV upload is required), login, a verification step (reCAPTCHA plus a 4-digit emailed code), forgot password (reCAPTCHA) | Password policy `VeryHard`, minimum 15 characters |
| **Applying** | Apply page, then a pre-check with five possible outcomes: submitted, CV mismatch, screening questionnaire, blocked, or a browser alert. Also withdrawing | Covered by part 1 |
| **Candidate workspace** | Action Center, Mailbox (with search), My Applications, Interview Invites, Account Settings, Job Alerts ("Add an Email Alert"), Saved Jobs, CV builder (target job, personal and contact details, experience, references, memberships, photo), Cover Letters | Each area has its own AJAX endpoint (mailbox, dashboards, interviews) |
| **Localisation** | Full Arabic site under `/ar/` with `dir=rtl`, and a language switch | Job content stays in English |
| **Platform and integrations** | JobPosting JSON-LD, sitemap, `robots.txt`, analytics (GA, Hotjar), social links, "Free Resources" (ownmycareer.com) | Third-party pages are out of scope |

---

## 4. Findings from the tour

These are candidate defects and risks, found by exploring and confirmed with a second check. Severity is my assessment.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| F1 | **The JobPosting structured data on job pages is invalid JSON.** Raw control characters inside `description` break parsing, so Google for Jobs may not list these jobs. | `JSON.parse` fails: "Bad control character in string literal" | High |
| F2 | **Accessibility (WCAG 2.1 AA):** low color contrast on every page (69 cases on the results page), unnamed links (icon links such as social and save) and unnamed selects (sort, pagination), and a missing image `alt`. | axe-core, 4 to 6 failed rules per page | High |
| F3 | **Zoom is disabled on mobile** by the viewport meta tag (WCAG 1.4.4). | axe `meta-viewport` fails on every page | Medium |
| F4 | **Registration and forgot-password fields have no labels,** only placeholders. | No `<label>` or `aria-label` on the fields | Medium |
| F5 | **Most pages have no `<h1>`:** home, About pages, Hiring Process, search results, Interview Invites. | DOM check across pages | Medium |
| F6 | **Some pages are slow to finish loading.** Home fires its `load` event at about 11 s, even though content is ready at about 1.9 s. Hiring Process took about 12.8 s, and the Arabic home about 9.9 s. | Navigation Timing API | Medium |
| F7 | **Small tap targets:** 10 to 13 links or buttons under 24 px per page on mobile (WCAG 2.5.8). | iPhone 13 viewport | Low |
| F8 | **Out-of-range pages are handled inconsistently.** With 49 jobs (5 pages), `?page=6` says *"Sorry, no jobs matched your search criteria"*, but `?page=99` silently shows page 1. | The JSON API and the UI agree on both | Low |
| F9 | **The Arabic header still says "Login" in English.** | Screenshot of the Arabic results page | Low |
| F10 | **`robots.txt` has `Disallow: /*/about-us/`,** which also matches `/en/page/about-us/`. It looks like a shared platform rule. | robots.txt | Low (to confirm) |
| F11 | **Anonymous access to job pages changed during testing:** a 302 to login earlier in testing, a 200 later the same day. | curl and Playwright | Info (to confirm the intended behaviour) |
| F12 | **Account Settings needs a per-session `?token=` in its URL.** Without it you get "Unauthorized Access", so the page can't be bookmarked or deep-linked. | Opening the page without the token | Info |
| F13 | **One active session per account,** and the session is tied to the browser's user agent. | Part 1 cross-browser run | Info (a constraint for testing) |
| F14 | **The reCAPTCHA seems risk-based:** it appeared in Chromium but not in Firefox or WebKit. | Part 1 logins | Info |
| F15 | **The CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts.** That weakens protection against XSS. | Response headers | Info (for a security review) |

**What works well:**
- **Security headers:** HSTS with preload, CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Secure` / `HttpOnly` cookies.
- **Search input is handled safely:** a script tag in the search keyword is not echoed back into the page.
- **Protected pages redirect to login** with a `return_url`.
- **Mobile layout:** no horizontal scrolling.
- **Empty states exist** for no results, no messages and no interview invites.

---

## 5. Scope and priorities

**Prioritisation:** each area is scored by *impact on a candidate or on Bupa* × *likelihood of breaking* × *how often it's used*.

| Priority | Area | Why |
|---|---|---|
| **P0** | Sign in and session, job search and job details, applying and application status, registration | Nothing else matters if a candidate can't find a job or apply. These areas also change most often. |
| **P0** | Job data correctness (API) and JobPosting structured data | Wrong or missing jobs cost applicants directly, and F1 is live. |
| **P1** | CV builder, Job Alerts, Saved Jobs, Mailbox, Interview Invites, forgot password, Cover Letters | Used after sign-in by active candidates, with medium impact |
| **P1** | Arabic / RTL, mobile, accessibility | A large share of users in KSA, legal and ethical duty, and several open defects |
| **P2** | Content pages, FAQ, footer and social links, language switch on content pages | Low change rate and low impact |

**Out of scope:**
- third-party sites (social networks, ownmycareer.com)
- how Google's reCAPTCHA works
- the recruiter and employer side, which isn't visible from the candidate portal
- load or stress testing on production
- a full penetration test, which should be a separate engagement

---

## 6. Test strategy: which test types, and why

The layers follow the test pyramid: lots of cheap, fast tests at the bottom, and a few slow, realistic ones at the top.

| Layer | What it covers | Why this layer | Volume |
|---|---|---|---|
| **API** (Playwright `request`) | Search JSON: totals, paging, keyword, filters, sorting, facets (`cluster`), response shape. Job text, similar jobs. Protected endpoints return 401 when logged out. | Most data rules live here. No browser, so a run takes seconds. It checks the data contract behind the Vue lists, which the UI tests then rely on. | High |
| **UI end-to-end** (Page Object Model) | The P0 and P1 journeys: register, sign in, search, apply, withdraw, save a job, create an alert, edit the CV, read the mailbox | Proves that real users can complete their tasks. Kept small because it's slow and depends on live data. | Low to medium |
| **UI functional** | Form checks (registration, login, forgot password, advanced search), filters and sort in the UI, empty states, pagination edge cases (F8) | Fast checks on single pages, without a full journey | Medium |
| **Accessibility** (`@axe-core/playwright`) | WCAG 2.1 AA on every key page, in English and Arabic, desktop and mobile | F2 to F5 and F7 show real problems. Keep a baseline and fail the build on **new** violations. | Every key page |
| **Visual regression** (`toHaveScreenshot`) | Key layouts in English and Arabic, desktop and mobile. Changing content (job lists, dates) is masked. | Catches broken CSS and RTL mirroring that functional tests can't see | About 20 snapshots |
| **SEO and structured data** | Every job page's JSON-LD parses and has the JobPosting fields Google requires. The sitemap lists the active jobs. robots.txt doesn't block public pages. | F1 and F10. The API gives the full job list, so this can check every job, not a sample. | Every job |
| **Localisation / RTL** | `lang` and `dir` attributes, translated UI strings, mirrored layout, the language switch keeps you on the same page | F9. Arabic is a first-class market. | Medium |
| **Cross-browser and mobile** | P0 journeys on Chromium, Firefox and WebKit, and on phone viewports | Already built in part 1 as projects per browser | P0 set |
| **Performance** | Lighthouse CI budgets (LCP, CLS, total page size) on key pages in the QA environment, plus a light timing check on production | F6. Catch regressions, not benchmark the site. | Key pages |
| **Security (basic)** | Header checks, protected routes when logged out, XSS reflection probes on inputs, cookie flags, and an OWASP ZAP baseline scan on the QA environment | Cheap safety net. A full pen test is out of scope. | Per release |
| **Production monitoring** | Hourly, anonymous and read-only: home → search → job page, API health, JSON-LD validity | Catches outages and data problems between releases | 3 to 5 checks |
| **Manual / exploratory** | CAPTCHA behaviour, email content, new features, usability | Things automation can't or shouldn't judge | Each release |

---

## 7. Test catalogue

These are high-level scenarios to start from. **Tags:** `@p0`, `@p1` and `@p2` for priority, plus `@smoke`, `@api` and `@a11y`.

### 7.1 Job discovery

| ID | Scenario | Type | Pri |
|---|---|---|---|
| JD-01 | A search with no filters returns `totalJobs > 0`, 10 jobs on page 1, and totals that match the page count | API | P0 |
| JD-02 | A keyword search finds jobs whose title contains the keyword, and the results are ordered by relevance | API | P0 |
| JD-03 | Each filter narrows the results, and its facet count in `cluster` equals the number of results after filtering | API | P0 |
| JD-04 | Each of the 4 sort options orders the results correctly (A–Z, Z–A, posted date, relevance) | API | P1 |
| JD-05 | Paging: the last page holds `total mod 10` jobs, and out-of-range pages behave the same way (covers F8) | API + UI | P1 |
| JD-06 | No results shows the empty-state message, and odd input (script tags, Arabic text, blanks, very long strings) is handled safely | UI | P1 |
| JD-07 | A job card's title, location and date match the API data, and "View Job Details" opens the right job | UI | P0 |
| JD-08 | Job page: title, description, location and Apply Now are present, and "similar jobs" appears when logged in | UI | P0 |
| JD-09 | Advanced Search: each field narrows the results, and resetting the form works | UI | P1 |
| JD-10 | Every job page's JSON-LD is valid and contains `title`, `datePosted`, `hiringOrganization`, `jobLocation` and `description` (covers F1) | SEO | P0 |
| JD-11 | The sitemap lists every active job, and closed jobs are removed | SEO | P1 |

### 7.2 Identity and session

| ID | Scenario | Type | Pri |
|---|---|---|---|
| ID-01 | Log in with valid details, get the verification step, complete it, and land logged in (needs the CAPTCHA test key in QA) | UI | P0 |
| ID-02 | Wrong password or unknown account shows the site's error, and the user stays logged out *(already built)* | UI | P0 |
| ID-03 | Empty fields show per-field messages *(already built)* | UI | P1 |
| ID-04 | Verification step: a wrong code, an expired code, and resend | UI | P1 |
| ID-05 | A new login ends the other session (F13), and logout ends the session | UI | P1 |
| ID-06 | Protected pages redirect to login with `return_url`, and after login you land back on the page you asked for | UI | P0 |
| ID-07 | Registration: required fields, password policy (`VeryHard`, 15 or more characters), a CV file of the wrong type or size, a duplicate email, and the terms checkbox | UI | P0 |
| ID-08 | Forgot password: the email is sent and the reset link works (needs a test mailbox) | UI | P1 |

### 7.3 Applying *(extends part 1)*

| ID | Scenario | Type | Pri |
|---|---|---|---|
| AP-01 | Apply, see the confirmation, see the job in My Applications, then withdraw *(already built)* | UI | P0 |
| AP-02 | The CV-mismatch pop-up: "Do not apply" doesn't apply, and "Apply anyway" applies but can't be withdrawn | UI | P1 |
| AP-03 | A screening questionnaire must be completed before submitting, and answers are required (on a **test job** in QA) | UI | P1 |
| AP-04 | A cover letter is attached (character limit, saved letters) | UI | P1 |
| AP-05 | You can't apply twice: the job shows Withdraw, or neither button | UI | P0 |

### 7.4 Candidate workspace

| ID | Scenario | Type | Pri |
|---|---|---|---|
| WS-01 | Action Center shows the latest applications and messages, and each empty state has a message | UI | P1 |
| WS-02 | Saved Jobs: save from a job card, see it in the list, unsave it | UI | P1 |
| WS-03 | Job Alerts: create one from a search, edit it, delete it | UI | P1 |
| WS-04 | CV builder: edit each section, upload a photo (type and size limits), and the changes show up on the application page | UI | P1 |
| WS-05 | Mailbox: list, open and search messages, and a recruiter message arrives (needs QA seeding) | UI | P2 |
| WS-06 | Interview Invites: list, accept or decline (needs QA seeding) | UI | P2 |
| WS-07 | Account Settings: change contact details, then reach the page again through the menu (tokenised URL, F12) | UI | P2 |

### 7.5 Cross-cutting

| ID | Scenario | Type | Pri |
|---|---|---|---|
| X-01 | No **new** serious or critical axe violations on key pages, in both languages, desktop and mobile (baseline F2–F5, F7) | a11y | P1 |
| X-02 | Every page has one `<h1>`, and forms have labels (F4, F5) | a11y | P1 |
| X-03 | Arabic: `dir=rtl`, no English UI strings left (F9), the layout is mirrored, and switching language keeps you on the same page | L10n + visual | P1 |
| X-04 | Visual snapshots of home, results, job page, login and registration, in English and Arabic, desktop and mobile | Visual | P1 |
| X-05 | Internal links: no 4xx or 5xx responses, and no console errors on key pages | UI | P2 |
| X-06 | Security headers stay present, and cookie flags stay `Secure` and `HttpOnly` | API | P1 |
| X-07 | Lighthouse budgets for LCP, CLS and page weight on home, results and the job page (F6) | Perf | P2 |

---

## 8. Environments and test data

| Environment | What runs there | Rules |
|---|---|---|
| **QA / staging** (needed) | Everything | CAPTCHA test keys, seeded accounts, test job postings, a test mailbox, and data reset through the API |
| **Production** | Monitoring, plus the P0 smoke tests | Read-only, except apply-and-withdraw on **one designated test job**. No registrations, no questionnaires, no messages. |

**Test data:**
- **Accounts:** one per parallel worker and per browser, because the site keeps one session per account (F13). Each needs a complete CV. Every account and its session file are named after the browser and worker that use them.
- **Test jobs in QA:**
  - one that always accepts applications
  - one with a CV-mismatch rule
  - one with a screening questionnaire
  - one closed job
- **Mailbox:** a service with an API (for example Mailosaur) or IMAP, for verification codes, password resets and alert emails.
- **Created data:** each test deletes what it creates (applications, alerts, saved jobs, cover letters), through the UI or the API.
- **Personal data:**
  - Traces, screenshots and videos from account pages contain real CV data.
  - QA uses synthetic identities only.
  - Test output from production is masked, or kept only when a test fails, and deleted after a short retention period.

---

## 9. Tooling

| Need | Choice | Why |
|---|---|---|
| UI, API, visual, cross-browser | **Playwright + TypeScript** | One tool and one language for all layers. Auto-waiting, projects per browser, sessions reused through `storageState`, and a trace viewer for debugging. Already proven in part 1. |
| Accessibility | `@axe-core/playwright` | The industry-standard rule engine, running inside the same tests |
| API response shape | `zod` (or `ajv`) | Type-safe checks of the JSON responses, and a readable diff when a check fails |
| Performance | Lighthouse CI | Budgets enforced in CI, with reports kept over time |
| Security baseline | OWASP ZAP baseline scan | Free, passive, and safe to run against QA on every release |
| Email | Mailosaur (or IMAP with `imapflow`) | Verification codes and email content checks |
| Reporting | Playwright HTML report (+ Allure if the team wants history) and CI annotations | Traces are attached to failures, and results link from CI |
| CI | GitHub Actions (or the team's existing CI) | Matrix across browsers and projects, scheduled jobs, artefact retention |

**Alternatives I considered:**
- **Cypress:** weaker multi-tab and cross-browser support, and no WebKit.
- **Selenium:** more plumbing for waiting, tracing and API testing.
- **Separate API tools** (Postman/Newman): a second language and a second toolchain. Keeping everything in Playwright means one codebase, one report and one CI job type.

---

## 10. Framework structure

An extension of the part 1 repository:

```
tests/
  api/                 search.api.spec.ts, job.api.spec.ts, auth-guards.api.spec.ts
  e2e/                 apply-job.spec.ts, saved-jobs.spec.ts, job-alerts.spec.ts, cv.spec.ts …
    logged-out/        login.spec.ts, register.spec.ts, forgot-password.spec.ts
  a11y/                pages.a11y.spec.ts        (one baseline per page, language and device)
  visual/              layouts.visual.spec.ts    (masked dynamic regions)
  seo/                 jsonld.spec.ts, sitemap.spec.ts, robots.spec.ts
  monitoring/          prod-smoke.spec.ts        (read-only, tagged @monitor)
  pages/               page objects (as in part 1) + components/
  api-clients/         JobSearchClient.ts …      (typed wrappers + zod schemas)
  fixtures/            test.ts: page objects, API clients, accounts per worker
  test-data/           builders + static JSON (no secrets)
  utils/               env.ts, mail.ts, a11y.ts (baseline helper)
```

**Conventions (from part 1):**
- **Locators:** role, label or placeholder first. Never styling classes.
- **Page objects:** they wait for states, and the specs make the assertions.
- **Outcomes:** when an action can end in several ways, it returns a result instead of guessing.
- **Waiting:** no `networkidle` and no fixed sleeps.
- **Tags:** `@p0` `@p1` `@p2` `@smoke` `@api` `@a11y` `@visual` `@monitor`, used with `--grep` to choose what runs where.
- **Projects:** a setup project, logged-in and logged-out projects for each browser, a mobile project, and an API project with no browser.

---

## 11. Execution and CI/CD

| When | What | Where | Target time |
|---|---|---|---|
| **Every pull request** | Type-check and lint, all API tests, `@smoke` UI tests on Chromium | QA | < 10 min |
| **Nightly** | All `@p0` and `@p1` tests on all browsers and mobile, plus accessibility, visual, SEO and the ZAP baseline | QA | < 60 min |
| **Before a release** | The full regression suite, Lighthouse budgets, and a manual exploratory session | QA | Once per release |
| **After a deployment** | `@smoke` tests on production, read-only | Production | < 5 min |
| **Hourly** | `@monitor` checks, with alerts to the team channel | Production | < 2 min |

**Policies:**
- **Parallel runs:** one account per worker (F13). Workers ≤ the number of accounts.
- **Retries:** read-only suites may retry once, and a test that only passes on retry is reported as **flaky**. Suites with side effects never retry.
- **Flaky tests:** they're tagged `@quarantine`, keep running without blocking the build, get fixed within a set time, and are tracked in the report.
- **What fails the build:** P0 failures, new serious accessibility violations, invalid JSON-LD, and missing security headers.

**Metrics:**
- how many P0 and P1 scenarios are automated
- pass rate and flaky rate (goal: under 2%)
- mean time to fix a red build
- defects that reached production
- suite run time against the targets above

---

## 12. Phased rollout

| Phase | Weeks | What's delivered |
|---|---|---|
| **0: Foundations** | 1 | QA environment access, CAPTCHA test keys, seeded accounts and test jobs, a test mailbox, the CI pipeline, and the framework (part 1) moved to the new structure |
| **1: Fast safety net** | 1–2 | API tests for search and jobs (JD-01 to 05), JSON-LD checks on every job (JD-10), security headers (X-06), and production monitoring |
| **2: Critical journeys** | 3–4 | P0 UI journeys (ID-01, 06, 07, AP-01, 05, JD-07, 08) on 3 browsers, plus the accessibility baseline (X-01, 02) |
| **3: Breadth** | 5–6 | P1 workspace features (WS-01 to 04), Arabic and RTL with visual snapshots (X-03, 04), mobile, and verification-code edge cases (ID-04) |
| **4: Quality attributes** | 7–8 | Lighthouse budgets, ZAP baseline, link and console checks, and the P2 scenarios |
| **Ongoing** | – | A test in the same pull request as every new feature, a quarterly review of flaky tests and run time, and exploratory sessions each release |

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The CAPTCHA blocks automated sign-in | Test keys or an allowlist in QA. On production, a person signs in once and the session is reused (part 1). |
| One session per account (F13) | An account per worker and per browser, a guard that stops shared accounts, and a clear error when a session has ended (part 1) |
| Live data changes (jobs open and close) | Choose jobs at run time, use test jobs in QA, and check data against the API instead of hard-coded values |
| The legacy page structure has no test ids | Use role-based locators now, and ask for `data-testid` on key controls (section 14) |
| Personal data in test output | Synthetic identities in QA, masking, and short retention |
| Slow third-party scripts make tests flaky | Wait on the states the test needs, never on the network going quiet. Optionally block analytics requests in UI tests. |
| Side effects on production (applications reaching recruiters) | Production is read-only apart from one designated test job. Default to apply-and-withdraw, and never answer questionnaires. |

---

## 14. What I'd need from the platform team

1. **A QA or staging environment,** with reCAPTCHA test keys or an allowlist for test accounts.
2. **Seeded test accounts,** one per parallel worker and per browser, each with a complete CV, and a way to reset them.
3. **Test job postings:** one that always accepts applications, one with a CV-mismatch rule, one with a questionnaire, and one closed.
4. **A test mailbox or email capture** in QA, for verification codes, password resets and alerts.
5. **`data-testid` attributes** on key controls: search, filters, the Apply and Withdraw actions, and account menus.
6. **Answers to three questions:**
   - Is anonymous access to job pages intended (F11)?
   - Is the `about-us` rule in `robots.txt` intended (F10)?
   - Is there an API to seed and clean up applications, alerts and saved jobs?
