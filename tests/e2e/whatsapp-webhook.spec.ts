import { test, expect } from '@playwright/test'

test.describe('WhatsApp webhook (Meta verification handshake)', () => {
  test('GET without params returns 403', async ({ request }) => {
    const res = await request.get('/api/whatsapp/webhook')
    expect(res.status()).toBe(403)
  })

  test('GET with wrong verify token returns 403', async ({ request }) => {
    const res = await request.get('/api/whatsapp/webhook', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'definitely-not-the-real-token',
        'hub.challenge': '12345',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('GET with correct verify token echoes challenge', async ({ request }) => {
    const token = process.env.WHATSAPP_VERIFY_TOKEN
    test.skip(!token, 'WHATSAPP_VERIFY_TOKEN not set in env — Meta handshake test skipped')

    const challenge = 'cth-launch-check-' + Date.now()
    const res = await request.get('/api/whatsapp/webhook', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': token!,
        'hub.challenge': challenge,
      },
    })
    expect(res.status()).toBe(200)
    expect(await res.text()).toBe(challenge)
  })
})
