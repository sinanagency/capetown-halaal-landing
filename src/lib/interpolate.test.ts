// Unit tests for src/lib/interpolate.ts. Runs under `node --import tsx --test`.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { renderTemplate, cleanupWhitespace } from './interpolate'

test('missing name in greeting collapses leading space + comma', () => {
  const out = renderTemplate('Hi {{first_name}},\n\nWe noticed...', { first_name: null })
  assert.equal(out, 'Hi,\n\nWe noticed...')
})

test('missing name mid-sentence cleans surrounding whitespace', () => {
  const out = renderTemplate('Hello {{first_name}} welcome to the festival.', { first_name: '' })
  assert.equal(out, 'Hello welcome to the festival.')
})

test('possessive cleanup drops empty `’s` clause', () => {
  const out = renderTemplate("...for {{first_name}}'s order...", { first_name: null })
  assert.equal(out, '...for order...')
})

test('all variables present passes through verbatim', () => {
  const out = renderTemplate(
    'Hi {{first_name}}, your stall {{stall_tier}} is held for {{festival_dates}}.',
    { first_name: 'Aisha', stall_tier: 'F-12', festival_dates: '11-13 December' },
  )
  assert.equal(out, 'Hi Aisha, your stall F-12 is held for 11-13 December.')
})

test('whitespace-only value is treated as empty', () => {
  const out = renderTemplate('Hi {{first_name}},', { first_name: '   ' })
  assert.equal(out, 'Hi,')
})

test('double space inside body collapses to single space', () => {
  const out = renderTemplate('Hi  {{first_name}}  there', { first_name: 'Aisha' })
  assert.equal(out, 'Hi Aisha there')
})

test('unknown placeholder treated as empty, surrounding cleaned', () => {
  const out = renderTemplate('Order ready for {{unknown_var}}.', {})
  assert.equal(out, 'Order ready for.')
})

test('cleanupWhitespace handles already-clean input idempotently', () => {
  assert.equal(cleanupWhitespace('Hi Aisha, welcome.'), 'Hi Aisha, welcome.')
})

test('multiple missing vars on same line collapse without orphans', () => {
  const out = renderTemplate('{{first_name}} {{last_name}} - vendor', {
    first_name: null,
    last_name: null,
  })
  assert.equal(out, '- vendor')
})

test('numbers are preserved', () => {
  const out = renderTemplate('Order #{{order_id}} for {{first_name}}', {
    order_id: 42,
    first_name: 'Aisha',
  })
  assert.equal(out, 'Order #42 for Aisha')
})
