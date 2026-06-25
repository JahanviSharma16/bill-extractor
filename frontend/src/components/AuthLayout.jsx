import { Link } from 'react-router-dom'

const features = [
  'AI-powered bill classification',
  'Hybrid OCR extraction',
  'Human review workflow',
  'Standardized JSON output',
]

export default function AuthLayout({ title, subtitle, footerText, footerLink, footerLabel, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-teal-200/25 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="hidden lg:block">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-md shadow-brand-600/25">
                ZC
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">Zero Carbon</p>
                <p className="text-sm text-slate-500">Bill Extractor</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold leading-tight tracking-tight text-slate-900">
              Smart utility bill processing for sustainability teams
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Upload electricity, fuel, and utility invoices. Extract structured data
              with OCR and AI — ready for carbon accounting and reporting.
            </p>

            <ul className="mt-8 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                ZC
              </div>
              <div>
                <p className="font-semibold text-slate-900">Zero Carbon</p>
                <p className="text-xs text-slate-500">Bill Extractor</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-8 shadow-xl shadow-slate-200/60 backdrop-blur-sm sm:p-10">
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
              </div>

              {children}

              <p className="mt-8 text-center text-sm text-slate-500">
                {footerText}{' '}
                <Link to={footerLink} className="font-semibold text-brand-600 hover:text-brand-700">
                  {footerLabel}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
