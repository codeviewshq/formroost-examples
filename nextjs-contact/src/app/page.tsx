import { ContactForm } from './contact-form'

export default function Page() {
  return (
    <main className="mx-auto max-w-lg rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-2xl font-semibold tracking-tight">Contact us</h1>
      <p className="mt-2 text-sm text-slate-600">We usually reply within one business day.</p>
      <ContactForm />
    </main>
  )
}
