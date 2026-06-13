import { test, expect } from '@playwright/test'

// Anonymous smoke test for the public homepage.
//
// No credentials required. Asserts the festival hero copy, the Apply CTA,
// and the festival dates (11-13 December 2026) are all visible to a
// first-time visitor.

test.describe('Public homepage', () => {
  test('renders hero, apply CTA, and December 11-13 2026 dates', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)

    // 1) Body has festival-language hero text (Halaal / Young at Heart /
    //    festival). Matches the existing homepage.spec.ts pattern.
    await expect(page.locator('body')).toContainText(/halaal|young at heart|festival/i)

    // 2) Apply CTA: at least one anchor with href=/apply, ideally one
    //    labelled "Apply" or "Apply as Exhibitor" / "Apply as Vendor".
    const applyLinks = page.locator('a[href="/apply"], a[href^="/apply?"], a[href^="/apply#"]')
    expect(await applyLinks.count()).toBeGreaterThan(0)
    await expect(applyLinks.first()).toBeVisible()

    // 3) Festival dates visible. The hero/header/footer all repeat the
    //    11-13 December 2026 line in slightly different shapes
    //    ("11-13 December 2026", "December 11-13, 2026"). Match both.
    const datePattern = /(11\s*[-–]\s*13\s+december\s+2026|december\s+11\s*[-–]\s*13[,\s]+2026)/i
    await expect(page.locator('body')).toContainText(datePattern)
  })
})
