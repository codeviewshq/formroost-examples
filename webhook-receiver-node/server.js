import { createServer } from 'node:http'
import { verifyWebhook, WebhookVerificationError } from './verify.js'

const secret = process.env.FORMROOST_WEBHOOK_SECRET
if (!secret?.startsWith('whsec_')) {
  console.error('Set FORMROOST_WEBHOOK_SECRET=whsec_... (see .env.example)')
  process.exit(1)
}

// ponytail: in-memory dedupe, lost on restart; use your database for production.
const seen = new Set()

createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhooks/formroost') {
    res.writeHead(404).end()
    return
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const rawBody = Buffer.concat(chunks)

  let event
  try {
    event = verifyWebhook(secret, req.headers, rawBody)
  } catch (error) {
    const status = error instanceof WebhookVerificationError ? 401 : 400
    res.writeHead(status).end()
    return
  }

  const id = req.headers['webhook-id']
  if (!seen.has(id)) {
    seen.add(id)
    // Acknowledge fast; hand slow work to a queue.
    console.log(`${event.type} ${event.id}`, event.data)
  }
  res.writeHead(204).end()
}).listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Listening on http://localhost:${process.env.PORT ?? 3000}/webhooks/formroost`)
})
