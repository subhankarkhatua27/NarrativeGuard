import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, History, RefreshCw } from 'lucide-react';
import type { AnalysisResult, CheckClaimResponse } from '@/lib/types';
import { TIER_LABEL, VERDICT_META, fmtDate, keyOf, safeUrl } from '@/lib/ngHelpers';

type NavState = { response?: CheckClaimResponse; text?: string } | null;

export default function SeenBeforePage() {
  const navigate = useNavigate();
  const st = useLocation().state as NavState;
  const sb = st?.response?.seen_before;
  const verdicts = sb?.verdicts ?? [];
  const archive = sb?.archive ?? [];

  if (!sb?.found) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-base font-semibold text-slate-700">Nothing to show here.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-medium text-teal-700 underline">
          Back to the checker
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2 text-amber-900">
          <History className="h-5 w-5" />
          <h1 className="text-lg font-semibold">You may have seen this before</h1>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
          We found similar messages we have already looked at. They are similar, not necessarily the
          same claim, so one changed number or a missing &quot;not&quot; can change the answer.
        </p>
      </div>

      {verdicts.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Earlier checks</h2>
          <ul className="space-y-3">
            {verdicts.map((v, i) => {
              const res = v.result as AnalysisResult | undefined;
              const meta = VERDICT_META[keyOf(res)];
              return (
                <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {(v.similarity ?? 0) >= 0.9 ? 'Very similar' : 'Similar'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800">{v.claim || res?.claim || 'Earlier message'}</p>
                  {res?.basis && <p className="mt-1 text-xs text-slate-500">{res.basis}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {archive.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Related fact-checks and news</h2>
          <ul className="space-y-3">
            {archive.map((a, i) => {
              const href = safeUrl(a.url);
              return (
                <li key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 text-sm font-medium text-teal-700 hover:underline"
                    >
                      {a.title || href}
                      <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-slate-800">{a.title || 'Untitled'}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {[a.source || a.domain, a.tier ? TIER_LABEL[a.tier] : '', fmtDate(a.published_at)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/', { state: { text: st?.text, force: true } })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
        >
          <RefreshCw className="h-4 w-4" />
          Check this exact message anyway
        </button>
        <button
          type="button"
          onClick={() => navigate('/', { state: { text: st?.text } })}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}
