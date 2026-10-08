import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Gauge, Lock, Info } from 'lucide-react';

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to check
      </Link>

      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-900">About &amp; Limits</h1>
      </div>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Info className="h-5 w-5 text-teal-600" />
            What NarrativeGuard does
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            NarrativeGuard checks forwarded messages and social media claims against
            published fact-check reports and trusted news sources. It identifies how a
            claim was twisted, highlights red flags, and shows what is actually true.
            When it cannot verify a claim, it says so — that is a feature, not a bug.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Gauge className="h-5 w-5 text-teal-600" />
            Usage limits
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              Checks per IP: a limited number per hour and per day.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              There is a global daily cap on free analyses shared across all users.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              If you hit a limit, you can still browse the example claims.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              Free hosting may take up to a minute to wake up on first use.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Lock className="h-5 w-5 text-teal-600" />
            Privacy
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Phone numbers and emails are removed from your message before analysis.
            Free-tier AI prompts may be used by Google to improve its models. We do not
            store your submitted text beyond the analysis session.
          </p>
        </section>
      </div>
    </div>
  );
}
