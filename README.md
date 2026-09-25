# Bupa-Arabia
Technical Assessment for TalentEra (A product of Bayt.com)

Playwright + TypeScript automation of the job application flow on https://careers.bupa.com.sa/ (Page Object Model).

- [Walkthrough](docs/walkthrough.md): setup, structure, and how the code is written
- [Status](docs/status.md): where each feature stands and what's verified
- [Roadmap](docs/roadmap.md): milestones done and what comes next

## Quick start

```bash
npm install && npx playwright install chromium
cp .env.example .env     # fill in USER_EMAIL and USER_PASSWORD
npm run auth             # one-time headed login: tick the reCAPTCHA, type the emailed code
npm test                 # login checks + search → apply → verify → withdraw
SLOW_MO=500 npx playwright test --ui   # watch it step by step
```

## Design rationale

- **The reCAPTCHA is never bypassed.** Every login ends with a reCAPTCHA checkbox and an emailed 4-digit code. A person completes that step once (`npm run auth`). The session is saved, and every later run checks it and reuses it in about 3 seconds. Unattended runs need the platform to provide a CAPTCHA-free test environment, and `OtpPage.verify(code)` is already in place for that.
- **Three Playwright projects per browser:** `setup-<browser>` (check or create that browser's session), `<browser>` (logged-in specs) and `<browser>-logged-out` (specs that must start without a session, and still run when it has expired). `BROWSERS=chromium,firefox,webkit` runs a compatibility pass. Each browser keeps its own session, because the site ties a session to the user agent. The site also keeps only one active session per account, so a logged-in cross-browser run needs one account per browser (`USER_EMAIL_<BROWSER>`). See the [walkthrough](docs/walkthrough.md#8-extending-the-suite).
- **Page Object Model with clear roles.**
  - Page objects hold locators and actions, and wait for the state the next step needs.
  - Specs decide what to check and make the assertions.
  - A step that lands on a new page returns that page object (`login()` → `OtpPage`).
  - Fixtures create the page objects.
- **Locators a user would recognise.** Role, label, placeholder or alt text first. Stable form ids and names come next. Never styling classes or URLs that carry a session token.
- **Results instead of guesses.** Applying can end in several ways on this site. `ApplicationPage.submit()` returns `submitted | mismatch | questionnaire | blocked` with what the site showed (pop-up or alert text, or the questionnaire URL). The spec skips jobs it can't apply to cleanly and tries the next one.
- **Safe on a live site.**
  - The default mode applies, checks the result, then withdraws. `APPLY_MODE=dry-run` never submits.
  - Screening questionnaires are never answered: those jobs are skipped.
  - Negative tests use made-up accounts.
  - Tests run one at a time, with no automatic retries.
- **Waits on state, not time.** Web-first assertions, the site's own "Loading..." images and its logged-in flag. No fixed sleeps, and no `networkidle` (analytics traffic never stops).
