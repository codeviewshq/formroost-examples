# FormRoost examples

Copy-paste starters for [FormRoost](https://formroost.com), the hosted form backend. Your site renders the form; FormRoost validates submissions, stores leads, and sends signed webhooks.

| Starter | Stack | Shows |
| --- | --- | --- |
| [`astro-contact`](./astro-contact) | Astro, TypeScript, Tailwind CSS | Progressive-enhancement contact form |
| [`nextjs-contact`](./nextjs-contact) | Next.js App Router, TypeScript, Tailwind CSS | Browser form **and** a server Route Handler with an API key |
| [`html-tailwind-contact`](./html-tailwind-contact) | One HTML file, vanilla JS, Tailwind | No build step |
| [`small-business-quote`](./small-business-quote) | HTML, vanilla JS, Tailwind | Local service "Request a quote" form |
| [`coach-booking-inquiry`](./coach-booking-inquiry) | HTML, vanilla JS, Tailwind | Dark-mode discovery call inquiry form |
| [`product-waitlist`](./product-waitlist) | HTML, vanilla JS, Tailwind | Early-access waitlist signup form |
| [`portfolio-inquiry`](./portfolio-inquiry) | HTML, vanilla JS, Tailwind | Creative/photographer shoot booking form |
| [`webhook-receiver-node`](./webhook-receiver-node) | Node.js 20+, zero dependencies | Standard Webhooks signature check |

## Sandbox first

Every starter points at a **sandbox** placeholder, `https://formroost.com/s/v1/sandbox/fpub_REPLACE_ME`, so nothing reaches production by accident.

1. In FormRoost, create a project and a form, then copy its sandbox submission URL.
2. Add your dev origin (for example `http://localhost:4321` or `http://localhost:3000`) to the form's sandbox **Allowed origins**.
3. Send a test, then check **Inbox → Sandbox**.
4. When it works, add your live `https://` origin, publish the form, and switch `/sandbox/` to `/production/`.

## Quickstarts

### Astro

```sh
cd astro-contact
cp .env.example .env          # set PUBLIC_FORMROOST_ENDPOINT
pnpm install
pnpm dev                      # http://localhost:4321
```

### Next.js

```sh
cd nextjs-contact
cp .env.example .env.local    # set NEXT_PUBLIC_FORMROOST_ENDPOINT (and the server vars for /api/contact)
pnpm install
pnpm dev                      # http://localhost:3000
```

The page posts straight from the browser. `src/app/api/contact/route.ts` shows the server path: it sends `Authorization: Bearer $FORMROOST_API_KEY` and an `Idempotency-Key`, and never sends `Origin`. Keep the key in a variable without the `NEXT_PUBLIC_` prefix so it never reaches the browser.

```sh
curl -X POST http://localhost:3000/api/contact \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","message":"Hello"}'
```

### Static HTML

Set the form `action` in `html-tailwind-contact/index.html` to your sandbox URL, then serve the folder:

```sh
cd html-tailwind-contact
npx serve .                   # or: python3 -m http.server 8000
```

Opening `index.html` from disk sends `Origin: null`, which the allowlist rejects, so serve it over HTTP. The Tailwind browser build is for prototypes; use the Tailwind CLI in production.

### Webhook receiver

```sh
cd webhook-receiver-node
node --test                                   # signature tests
FORMROOST_WEBHOOK_SECRET=whsec_... node server.js
```

Point a FormRoost webhook at `https://<your-host>/webhooks/formroost`. Production destinations must be public HTTPS; for local testing, use a tunnel.

## What every form does

- **Works without JavaScript.** It is a normal `<form method="post">`, so FormRoost shows its own result page. JavaScript upgrades it to a `fetch` with `credentials: 'omit'` and `accept: application/json`.
- **Anti-spam fields.** `_gotcha` is a honeypot hidden from people (`tabindex="-1"`, `autocomplete="off"`); FormRoost quarantines any submission that fills it. `_fr_started_at` is the render time in Unix milliseconds, sent as a JSON number, so FormRoost can flag forms filled implausibly fast.
- **RFC 9457 errors.** Failures return `application/problem+json`. The forms show `detail` and `requestId`, and mark the fields named by `errors[].path` (JSON Pointers). Branch on `code`, never on `detail`. All codes: [formroost.com/docs/api/errors](https://formroost.com/docs/api/errors).
- **No API keys in the browser.** The public submission ID (`fpub_...`) is an address, not a secret. Server keys (`fr_..._key_...`) only go in server code.

## Webhook verification

FormRoost sends CloudEvents 1.0.2 JSON with Standard Webhooks headers `webhook-id`, `webhook-timestamp`, and `webhook-signature`. `verify.js`:

- signs `${webhook-id}.${webhook-timestamp}.${rawBody}` with HMAC-SHA256, keyed with the base64 bytes after `whsec_`;
- compares with `timingSafeEqual` against each space-separated `v1,<base64>` signature, so both secrets work during a 24-hour rotation;
- rejects timestamps more than 5 minutes from now.

Verify the raw bytes before parsing JSON, deduplicate on `webhook-id` (delivery is at least once), and return `2xx` fast.

## Using an AI coding agent

- Agent guide: [formroost.com/docs/agents](https://formroost.com/docs/agents)
- Skill: `npx skills add https://formroost.com`
- Remote MCP: `https://formroost.com/mcp` (OAuth 2.1). Claude Code users can install both from [`codeviewshq/formroost-plugin`](https://github.com/codeviewshq/formroost-plugin).

## Links

- [formroost.com](https://formroost.com)
- [AI Website Builder Guides (Lovable, Bolt, Replit, v0, ChatGPT, Claude)](https://formroost.com/guides)
- [Documentation](https://formroost.com/docs)
- [Submission API](https://formroost.com/docs/api/submissions)
- [Signed webhooks](https://formroost.com/docs/webhooks)

## License

[MIT](./LICENSE)
