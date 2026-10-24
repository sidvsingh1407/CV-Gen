import { test, expect } from '@playwright/test'

test('landing page loads and displays correct title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/CV Generator/)
  await expect(page.locator('h1')).toContainText('CV Generator')
})
