import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import { verifyWebhook, WebhookVerificationError } from './verify.js'

const newSecret = () => `whsec_${randomBytes(32).toString('base64')}`
const secret = newSecret()
const now = 1_790_000_000
const body = JSON.stringify({
  specversion: '1.0',
  type: 'submission.created',
  id: 'evt_test',
  source: 'https://formroost.com',
  data: { receiptId: 'sub_test' },
})

function sign(s, id, ts, payload) {
  const key = Buffer.from(s.slice('whsec_'.length), 'base64')
  return `v1,${createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64')}`
}

const headers = (signature, ts = now) => ({
  'webhook-id': 'msg_1',
  'webhook-timestamp': String(ts),
  'webhook-signature': signature,
})

test('accepts a valid signature and returns the parsed event', () => {
  const event = verifyWebhook(secret, headers(sign(secret, 'msg_1', now, body)), body, now)
  assert.equal(event.type, 'submission.created')
})

test('accepts a Buffer body', () => {
  const event = verifyWebhook(secret, headers(sign(secret, 'msg_1', now, body)), Buffer.from(body), now)
  assert.equal(event.data.receiptId, 'sub_test')
})

test('rejects a tampered payload', () => {
  const sig = sign(secret, 'msg_1', now, body)
  assert.throws(() => verifyWebhook(secret, headers(sig), body.replace('sub_test', 'sub_evil'), now), WebhookVerificationError)
})

test('rejects a signature from another secret', () => {
  assert.throws(() => verifyWebhook(secret, headers(sign(newSecret(), 'msg_1', now, body)), body, now), WebhookVerificationError)
})

test('rejects timestamps outside the 5-minute window', () => {
  const old = now - 301
  assert.throws(() => verifyWebhook(secret, headers(sign(secret, 'msg_1', old, body), old), body, now), /replay window/)
  const future = now + 301
  assert.throws(() => verifyWebhook(secret, headers(sign(secret, 'msg_1', future, body), future), body, now), /replay window/)
})

test('accepts at the edge of the window', () => {
  const edge = now - 300
  assert.ok(verifyWebhook(secret, headers(sign(secret, 'msg_1', edge, body), edge), body, now))
})

test('accepts any of several rotated signatures', () => {
  const previous = newSecret()
  const both = `${sign(previous, 'msg_1', now, body)} ${sign(secret, 'msg_1', now, body)}`
  assert.ok(verifyWebhook(secret, headers(both), body, now))
  assert.ok(verifyWebhook(previous, headers(both), body, now))
  assert.throws(() => verifyWebhook(newSecret(), headers(both), body, now), WebhookVerificationError)
})

test('rejects missing headers', () => {
  assert.throws(() => verifyWebhook(secret, {}, body, now), /Missing/)
})
