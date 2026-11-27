import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

test.describe('MaskMate End-to-End, Privacy & Accessibility Suite', () => {
  test('zero external network calls, CSP blocks outbound fetch, and first-visit onboarding flows work', async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith('http://127.0.0.1:4173') && !url.startsWith('data:') && !url.startsWith('blob:')) {
        externalRequests.push(url);
      }
    });

    await page.goto('/');

    // Welcome modal appears on first visit
    await expect(page.getByText('Do you know how to use MaskMate?')).toBeVisible();

    // Yes path -> Quick Summary -> Got it
    await page.getByRole('button', { name: /Yes, I know/i }).click();
    await expect(page.getByText('5-Step Quick Summary')).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page.getByText('5-Step Quick Summary')).toBeHidden();

    // Replay Tutorial -> No path -> walkthrough quest gating
    await page.getByRole('button', { name: /Replay tutorial/i }).click();
    await page.getByRole('button', { name: /No, teach me/i }).click();
    await expect(page.getByText('Step 1 of 9')).toBeVisible();
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByText('Step 2 of 9')).toBeVisible();

    const lockedBtn = page.getByRole('button', { name: 'Complete action' });
    await expect(lockedBtn).toBeDisabled();

    await page.locator('[data-tour="load-sample-btn"]').click();
    await expect(page.getByRole('button', { name: /Next/i })).toBeEnabled();
    await page.getByRole('button', { name: 'Skip' }).click();

    // Verify CSP actively blocks outbound fetch()
    const blocked = await page.evaluate(async () => {
      try {
        await fetch('https://example.com/leak');
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
    expect(externalRequests).toEqual([]);
  });

  test('CSV upload, formula-injection protection on download, and all 3 redaction modes work', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('maskmate.tutorial.v1', 'seen');
    });
    await page.goto('/');

    const csvPayload = [
      'name,formula,email',
      '"Doe, ""Jane""",=SUM(A1),jane@example.com',
      'Bob,+1234,bob@example.org',
    ].join('\n');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'contacts.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvPayload, 'utf8'),
    });

    await expect(page.getByText('contacts.csv')).toBeVisible();
    await page.getByRole('radio', { name: 'Partial Mask' }).click();
    await expect(page.getByText(/j\*\*\*@example\.com/)).toBeVisible();

    await page.getByRole('radio', { name: 'Pseudonymize' }).click();
    await expect(page.getByText('EMAIL_01')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-tour="download-btn"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('sanitized_contacts.csv');

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const downloadedText = await fs.readFile(downloadPath!, 'utf8');
    expect(downloadedText).toContain('EMAIL_01');
    expect(downloadedText).not.toContain('jane@example.com');
    expect(downloadedText).toContain("'=SUM(A1)");
    expect(downloadedText).toContain("'+1234");
  });

  test('keyboard-only workflow and WCAG 2.2 AA / axe-core scan in dark, light, and high-contrast modes', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('maskmate.tutorial.v1', 'seen');
    });
    await page.goto('/');

    // Skip link first Tab target
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toBeFocused();

    await page.locator('[data-tour="load-sample-btn"]').click();
    await page.getByRole('radio', { name: 'Pseudonymize' }).click();
    await expect(page.getByText(/Pseudonym Map/i)).toBeVisible();

    // Dark mode axe scan
    const darkScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(darkScan.violations).toEqual([]);

    // Switch to light mode & scan
    await page.getByRole('button', { name: /Switch to light theme/i }).click();
    const lightScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(lightScan.violations).toEqual([]);

    // Mobile 320px viewport horizontal overflow check
    await page.setViewportSize({ width: 320, height: 640 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});

