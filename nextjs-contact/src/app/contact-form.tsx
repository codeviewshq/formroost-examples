'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

// Defaults to a sandbox placeholder so nothing reaches production by accident.
const endpoint =
  process.env.NEXT_PUBLIC_FORMROOST_ENDPOINT ?? 'https://formroost.com/s/v1/sandbox/fpub_REPLACE_ME'

type Problem = {
  code?: string
  title?: string
  detail?: string
  requestId?: string
  errors?: { path: string; code: string; message: string }[]
}
type Status = { tone: 'info' | 'success' | 'error'; text: string } | null

const input =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 focus:outline-none aria-invalid:border-red-500'
const tones = {
  info: 'bg-slate-50 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  error: 'bg-red-50 text-red-900 ring-red-200',
}

export function ContactForm() {
  const startedAt = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)

  // Set after hydration; the server-rendered form still posts natively without JS.
  useEffect(() => {
    if (startedAt.current) startedAt.current.value = String(Date.now())
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSending(true)
    setFieldErrors({})
    setStatus({ tone: 'info', text: 'Sending…' })

    const body: Record<string, unknown> = Object.fromEntries(new FormData(form))
    // FormRoost reads `_fr_started_at` as Unix milliseconds; send a number.
    body._fr_started_at = Number(body._fr_started_at) || undefined

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (response.status === 201) {
        const receipt: { receiptId: string } = await response.json()
        form.reset()
        if (startedAt.current) startedAt.current.value = String(Date.now())
        setStatus({ tone: 'success', text: `Thanks! We got your message. Reference: ${receipt.receiptId}` })
        return
      }
      // RFC 9457 problem+json: branch on `code`, show `detail`, keep `requestId` for support.
      const problem: Problem | null = await response.json().catch(() => null)
      const text = problem?.detail ?? problem?.title ?? `Request failed (HTTP ${response.status}).`
      setStatus({ tone: 'error', text: problem?.requestId ? `${text} (Request ID: ${problem.requestId})` : text })
      setFieldErrors(
        Object.fromEntries(
          (problem?.errors ?? []).map((issue) => [issue.path.replace(/^\//, '').split('/')[0], issue.message]),
        ),
      )
    } catch {
      setStatus({ tone: 'error', text: 'Network error. Check your connection and try again.' })
    } finally {
      setSending(false)
    }
  }

  const field = (name: string, label: string, props: Record<string, string> = {}) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {name === 'message' ? (
        <textarea id={name} name={name} rows={5} required aria-invalid={!!fieldErrors[name]} className={input} />
      ) : (
        <input id={name} name={name} required aria-invalid={!!fieldErrors[name]} className={input} {...props} />
      )}
      <p className="mt-1 text-sm text-red-700">{fieldErrors[name]}</p>
    </div>
  )

  return (
    <form action={endpoint} method="post" onSubmit={onSubmit} className="mt-8 space-y-5">
      {field('name', 'Name', { autoComplete: 'name' })}
      {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
      {field('message', 'Message')}

      {/* Anti-spam: honeypot (hidden from people) and render timestamp. */}
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="_gotcha">Leave this field empty</label>
        <input id="_gotcha" name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={startedAt} type="hidden" name="_fr_started_at" />

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-orange-600 px-4 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-60"
      >
        Send message
      </button>
      <p role="status" aria-live="polite" hidden={!status} className={`rounded-lg px-3 py-2 text-sm ring-1 ${status ? tones[status.tone] : ''}`}>
        {status?.text}
      </p>
    </form>
  )
}
