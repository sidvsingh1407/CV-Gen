import { test, expect } from '@playwright/test'

test('JD parser page loads', async ({ page }) => {
  await page.goto('/jd-parser')
  await expect(page.getByRole('heading', { name: 'Job Description Parser' })).toBeVisible()
})
