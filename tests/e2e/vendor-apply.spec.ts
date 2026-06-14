import { test, expect } from '@playwright/test'

test.describe('Vendor application', () => {
  test('/apply page renders form fields', async ({ page }) => {
    const response = await page.goto('/apply')
    expect(response?.status()).toBeLessThan(400)

    const formControls = page.locator('input, textarea, select')
    expect(await formControls.count()).toBeGreaterThan(0)
  })

  test('/vendors page renders', async ({ page }) => {
    const response = await page.goto('/vendors')
    expect(response?.status()).toBeLessThan(400)
  })
})
