import { expect, test } from '../fixtures/test';
import jobsJson from '../test-data/jobs.json';
import { type JobsData } from '../test-data/types';
import { env } from '../utils/env';

const jobs: JobsData = jobsJson;

/**
 * E2E: search → open a job → apply → verify → withdraw (APPLY_MODE, see .env.example).
 *
 * Runs on the live site with a real account, so the target job is chosen at run time:
 * jobs already applied to are skipped, a "CV doesn't match" warning is answered with
 * "Do not apply", and a job that requires a screening questionnaire is left unanswered
 * (answers would be claims sent to a real recruiter). Then the next job is tried
 * (at most MAX_JOB_ATTEMPTS submissions).
 */
test.describe('Job application', () => {
  test('a logged-in candidate can apply to a job', async ({ jobSearchPage, jobDetailsPage, myApplicationsPage }) => {
    // Search + verification, plus up to ~45s per submission attempt (pages + pre-check + pop-up).
    test.setTimeout(60_000 + env.maxJobAttempts * 45_000);
    const mode = env.applyMode;

    const candidates = await test.step(`Search jobs for "${jobs.searchKeyword}"`, async () => {
      await jobSearchPage.goto();
      await jobSearchPage.search(jobs.searchKeyword);
      const found = await jobSearchPage.listJobs();
      expect(found.length, 'search returned no jobs').toBeGreaterThan(0);
      return found;
    });

    const { job, applicationPage } = await test.step('Apply to the first eligible job', async () => {
      const tried: string[] = [];
      let submissions = 0;

      for (const candidate of candidates) {
        if (submissions >= env.maxJobAttempts) break;

        await jobDetailsPage.goto(candidate.url);
        if (!(await jobDetailsPage.canApply())) {
          tried.push(`${candidate.title}: already applied`);
          continue;
        }

        const applicationPage = await jobDetailsPage.startApplication();
        await expect(applicationPage.heading).toContainText(candidate.title);
        if (mode === 'dry-run') {
          await expect(applicationPage.submitButton).toBeEnabled();
          return { job: candidate, applicationPage };
        }

        submissions++;
        const outcome = await applicationPage.submit();
        if (outcome.status === 'submitted') return { job: candidate, applicationPage };

        // Not submitted: decline a mismatch; a questionnaire is simply left (the next job navigates away).
        tried.push(`${candidate.title}: ${outcome.status}, ${outcome.message}`);
        if (outcome.status === 'mismatch') await applicationPage.declineMismatch();
      }
      throw new Error(`No job accepted the application:\n- ${tried.join('\n- ')}`);
    });

    if (mode === 'dry-run') return;

    // Soft assertions: every check is reported, and the clean-up below still runs if one fails.
    await test.step('Confirmation message is shown', async () => {
      await expect.soft(applicationPage.confirmationMessage).toBeVisible();
    });

    await test.step('Application is listed in My Applications', async () => {
      await myApplicationsPage.goto();
      await expect.soft(myApplicationsPage.application(job.title)).toBeVisible();
    });

    // Checked last so the withdraw step can reuse this page instead of loading it again.
    await test.step('Job page now offers "Withdraw Application" instead of "Apply Now"', async () => {
      await jobDetailsPage.goto(job.url);
      await expect.soft(jobDetailsPage.withdrawLink).toBeVisible();
      await expect.soft(jobDetailsPage.applyNowLink).toBeHidden();
    });

    if (mode === 'apply-withdraw') {
      await test.step('Withdraw the application (leave the account clean)', async () => {
        await jobDetailsPage.withdraw();
        await expect(jobDetailsPage.applyNowLink).toBeVisible();
      });
    }
  });
});
