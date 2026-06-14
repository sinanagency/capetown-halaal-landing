import { test, expect } from '@playwright/test'

test.describe('Exhibitor portal auth gate', () => {
  test('/login renders login form', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('input[type="email"], input[name*="email" i]').first()).toBeVisible()
  })

  test('/exhibitor/portal redirects unauth users to login', async ({ page }) => {
    await page.goto('/exhibitor/portal')
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/login|\/exhibitor\/?(\?|$)/)
  })

  test('/exhibitor public landing renders', async ({ page }) => {
    const response = await page.goto('/exhibitor')
    expect(response?.status()).toBeLessThan(400)
  })
})
