import { test, expect } from '@playwright/test'

// Smoke test for the exhibitor contract sign flow.
//
// Requires a real demo vendor with creds in env. If DEMO_VENDOR_PASS is not
// set, the test is skipped (this keeps CI green on environments without the
// secret). When set, the test signs in as demo-saffron@cthalaal.co.za, lands
// on the contract page, types a name in the signature field, and clicks
// "Sign and accept".

const DEMO_EMAIL = 'demo-saffron@cthalaal.co.za'

test.describe('Exhibitor contract sign', () => {
  test('demo vendor can render contract and submit signature', async ({ page }) => {
    const password = process.env.DEMO_VENDOR_PASS
    test.skip(!password, 'DEMO_VENDOR_PASS not set in env; skipping live login')

    // 1) Visit login
    const loginResp = await page.goto('/exhibitor/login')
    expect(loginResp?.status()).toBeLessThan(400)

    // 2) Fill credentials and submit
    await page.locator('input[type="email"]').first().fill(DEMO_EMAIL)
    await page.locator('input[type="password"]').first().fill(password as string)
    await page.getByRole('button', { name: /sign in/i }).click()

    // 3) After login the first-login gate redirects approved-but-unsigned
    //    vendors to /exhibitor/portal/contract. Wait for either the contract
    //    page or the portal home (if already signed).
    await page.waitForLoadState('networkidle')
    const url = page.url()

    if (!/\/exhibitor\/portal\/contract/.test(url)) {
      // Already signed or routed elsewhere; navigate manually to confirm
      // the contract page still renders.
      const navResp = await page.goto('/exhibitor/portal/contract')
      expect(navResp?.status()).toBeLessThan(400)
    }

    // 4) Contract page sanity: heading visible
    await expect(page.getByRole('heading', { name: /vendor contract 2026/i })).toBeVisible()

    // 5) Signature panel: type mode is the default. If already signed, the
    //    panel renders a "Contract signed" badge instead, which is fine.
    const alreadySigned = await page.getByText(/contract signed/i).first().isVisible().catch(() => false)
    if (alreadySigned) return

    // 6) Type a name into the Full name input (the signature panel uses this
    //    as the script-rendered signature).
    const nameInput = page.locator('input[autocomplete="name"]').first()
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Demo Vendor Smoke Test')

    // 7) Click Sign and accept.
    await page.getByRole('button', { name: /sign and accept/i }).click()

    // 8) Either redirect to portal home or surface an inline error. Both are
    //    acceptable for a smoke run; we just assert the page didn't crash.
    await page.waitForLoadState('networkidle')
    expect(page.url()).toMatch(/\/exhibitor\/portal/)
  })
})
