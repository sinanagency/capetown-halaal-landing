import { test, expect } from '@playwright/test'

// Smoke test for the admin applications list page.
//
// Requires an admin account password in env (ADMIN_PASS). If unset the test
// is skipped so CI without secrets stays green. When set, logs in as
// taona@cthalaal.co.za, navigates to /admin/applications, and asserts the
// page renders plus the status filter row is visible.

const ADMIN_EMAIL = 'taona@cthalaal.co.za'

test.describe('Admin applications list', () => {
  test('admin can open applications and see filter row', async ({ page }) => {
    const password = process.env.ADMIN_PASS
    test.skip(!password, 'ADMIN_PASS not set in env; skipping live admin login')

    // 1) Admin login page
    const loginResp = await page.goto('/admin/login')
    expect(loginResp?.status()).toBeLessThan(400)

    // 2) Fill credentials and submit
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').first().fill(password as string)
    await page.getByRole('button', { name: /sign in|log ?in/i }).first().click()

    // 3) After login, layout verifies admin status and lands us on /admin.
    //    Navigate to applications and confirm a non-error response.
    await page.waitForLoadState('networkidle')
    const appsResp = await page.goto('/admin/applications')
    expect(appsResp?.status()).toBeLessThan(400)

    // 4) Page renders (some heading or container with "Applications" text).
    await expect(page.locator('body')).toContainText(/applications/i)

    // 5) Status filter row visible. The page exposes tab-like filters for
    //    All / Pending / Approved / Rejected / Info Requested. At least one
    //    of these labels should appear as a clickable element.
    const filterLabels = ['All', 'Pending', 'Approved', 'Rejected']
    let foundFilter = false
    for (const label of filterLabels) {
      const node = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first()
      if (await node.isVisible().catch(() => false)) {
        foundFilter = true
        break
      }
      const link = page.getByRole('link', { name: new RegExp(`^${label}$`, 'i') }).first()
      if (await link.isVisible().catch(() => false)) {
        foundFilter = true
        break
      }
    }
    expect(foundFilter, 'expected at least one status filter (All/Pending/Approved/Rejected) to be visible').toBe(true)
  })
})
