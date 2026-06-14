import { test, expect } from '@playwright/test'

const ADMIN_ROUTES = [
  '/admin',
  '/admin/analytics',
  '/admin/follow-up',
  '/admin/bot-inbox',
  '/admin/tickets',
  '/admin/contacts',
]

test.describe('Admin portal security', () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route} blocks unauth access`, async ({ page }) => {
      const response = await page.goto(route)
      await page.waitForLoadState('networkidle')

      const status = response?.status() ?? 0
      const redirectedToLogin = /\/login/.test(page.url())
      const blocked = status === 401 || status === 403 || status === 404 || redirectedToLogin

      expect(blocked, `expected ${route} to redirect to login or block unauth, got ${status} at ${page.url()}`).toBe(true)
    })
  }
})
