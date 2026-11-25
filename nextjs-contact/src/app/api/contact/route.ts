// Server-to-server submission. Use this path when your backend owns the form
// (for example after its own validation or a CRM lookup). The API key stays on
// the server: it is read from a non-NEXT_PUBLIC_ variable and never reaches the
// client bundle.
import { randomUUID } from 'node:crypto'

const endpoint =
  process.env.FORMROOST_SERVER_ENDPOINT ?? 'https://formroost.com/s/v1/sandbox/fpub_REPLACE_ME'

// ponytail: no auth or rate limit on this route; add your own before exposing it publicly.
export async function POST(request: Request) {
  const input = await request.json().catch(() => null)
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Response.json({ error: 'Expected a JSON object' }, { status: 400 })
  }

  const { name, email, message } = input as Record<string, unknown>
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
    // 8-200 chars, valid 24h. Reuse the same key when you retry the same submission.
    'idempotency-key': request.headers.get('idempotency-key') ?? randomUUID(),
  }
  // Required for production; optional in sandbox. Never send an Origin header from here:
  // an Origin switches FormRoost to browser allowlist checks even with a key.
  if (process.env.FORMROOST_API_KEY) headers.authorization = `Bearer ${process.env.FORMROOST_API_KEY}`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, email, message }),
  })

  // Pass FormRoost's receipt or RFC 9457 problem straight through.
  return new Response(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  })
}
