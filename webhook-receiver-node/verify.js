import { createHmac, timingSafeEqual } from 'node:crypto'

export const TOLERANCE_SECONDS = 5 * 60

export class WebhookVerificationError extends Error {}

/**
 * Verify a Standard Webhooks delivery from FormRoost.
 * Signed content is `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC-SHA256
 * keyed with the base64 bytes after the `whsec_` prefix.
 *
 * @param {string} secret   `whsec_...`
 * @param {Record<string, string | string[] | undefined>} headers  lower-cased header names
 * @param {string | Buffer} rawBody  exact request bytes, before any JSON parsing
 * @param {number} [nowSeconds]
 * @returns {unknown} the parsed CloudEvents envelope
 */
export function verifyWebhook(secret, headers, rawBody, nowSeconds = Math.floor(Date.now() / 1000)) {
  const id = header(headers, 'webhook-id')
  const timestamp = header(headers, 'webhook-timestamp')
  const signatures = header(headers, 'webhook-signature')
  if (!id || !timestamp || !signatures) throw new WebhookVerificationError('Missing webhook headers')

  const ts = Number(timestamp)
  if (!/^\d+$/.test(timestamp) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) {
    throw new WebhookVerificationError('Timestamp outside the replay window')
  }

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest()

  // During secret rotation FormRoost sends several space-delimited signatures.
  for (const entry of signatures.split(' ')) {
    const [version, value] = entry.split(',')
    if (version !== 'v1' || !value) continue
    const candidate = Buffer.from(value, 'base64')
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return JSON.parse(body)
    }
  }
  throw new WebhookVerificationError('No matching signature')
}

function header(headers, name) {
  const value = headers[name]
  return Array.isArray(value) ? value[0] : value
}
