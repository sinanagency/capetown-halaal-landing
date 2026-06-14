import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads and renders festival branding', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)

    await expect(page).toHaveTitle(/Halaal|Cape Town|Young at Heart/i)
    await expect(page.locator('body')).toContainText(/halaal|festival|stall|vendor|ticket/i)
  })

  test('has working primary CTA links', async ({ page }) => {
    await page.goto('/')
    const links = page.locator('a[href]')
    await expect(links.first()).toBeVisible()
  })
})
