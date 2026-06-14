import { test, expect } from '@playwright/test'

test.describe('Mobile viewport (vendors browse on phones)', () => {
  test('homepage renders on iPhone without horizontal scroll', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth }
    })

    expect(overflow.scrollWidth, 'horizontal scroll on mobile is a hard fail').toBeLessThanOrEqual(overflow.clientWidth + 1)
  })

  test('/apply renders on mobile', async ({ page }) => {
    const response = await page.goto('/apply')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('input, textarea').first()).toBeVisible()
  })
})
