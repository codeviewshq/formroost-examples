// Progressive enhancement for a FormRoost form. Without JavaScript the form
// still posts natively and FormRoost renders its own result page.
for (const form of document.querySelectorAll('form[data-formroost]')) {
  const startedAt = form.elements.namedItem('_fr_started_at')
  if (startedAt) startedAt.value = String(Date.now())

  const status = form.querySelector('[data-status]')
  const button = form.querySelector('button[type="submit"]')

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearErrors(form)
    button.disabled = true
    show(status, 'Sending…', 'info')

    const body = Object.fromEntries(new FormData(form))
    // FormRoost reads `_fr_started_at` as Unix milliseconds; send a number.
    body._fr_started_at = Number(body._fr_started_at) || undefined

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (response.status === 201) {
        const receipt = await response.json()
        form.reset()
        if (startedAt) startedAt.value = String(Date.now())
        show(status, `Thanks! We got your message. Reference: ${receipt.receiptId}`, 'success')
        return
      }
      const problem = await response.json().catch(() => null)
      showProblem(form, status, problem, response.status)
    } catch {
      show(status, 'Network error. Check your connection and try again.', 'error')
    } finally {
      button.disabled = false
    }
  })
}

// RFC 9457 problem+json: branch on `code`, show `detail`, keep `requestId` for support.
function showProblem(form, status, problem, httpStatus) {
  const messages = {
    origin_not_allowed: 'This site is not in the form\'s Allowed origins yet.',
    submission_rate_limited: 'Too many messages. Please wait a minute and try again.',
    submission_endpoint_not_found: 'This form is not set up yet. Check the endpoint URL.',
  }
  const text = messages[problem?.code] ?? problem?.detail ?? problem?.title ?? `Request failed (HTTP ${httpStatus}).`
  show(status, problem?.requestId ? `${text} (Request ID: ${problem.requestId})` : text, 'error')

  for (const issue of problem?.errors ?? []) {
    const name = issue.path?.replace(/^\//, '').split('/')[0]
    const field = name && form.elements.namedItem(name)
    if (!field) continue
    field.setAttribute('aria-invalid', 'true')
    const hint = form.querySelector(`[data-error-for="${name}"]`)
    if (hint) hint.textContent = issue.message
  }
}

function clearErrors(form) {
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid')
  for (const el of form.querySelectorAll('[data-error-for]')) el.textContent = ''
}

function show(status, text, tone) {
  status.textContent = text
  status.dataset.tone = tone
  status.hidden = false
}
