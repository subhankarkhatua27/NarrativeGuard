import { useState } from 'react';
import { Info, X, ShieldCheck, CheckCircle2, Newspaper, HelpCircle } from 'lucide-react';

export default function SourceTierLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
        aria-label="Source Tier Legend Info"
      >
        <Info className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
        <span>Tier Info</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover content */}
          <div className="absolute right-0 top-9 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Source Quality Tiers
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-950 dark:text-emerald-200">
                    Tier 1: Official & Primary
                  </span>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                    Government gazette notifications, central bank circulars, court rulings, primary official records.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-teal-200/80 bg-teal-50/60 p-3 dark:border-teal-900/40 dark:bg-teal-950/20">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600 mt-0.5" />
                <div>
                  <span className="font-bold text-teal-950 dark:text-teal-200">
                    Tier 2: Professional Fact-Checker
                  </span>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                    IFCN-signatory independent fact-checking outlets (e.g. PIB Fact Check, Alt News, Boom Live).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-blue-200/80 bg-blue-50/60 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                <Newspaper className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-950 dark:text-blue-200">
                    Tier 3: Established News & Wires
                  </span>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                    Recognized mainstream newspapers, national wire services, reputable news networks (e.g. Economic Times, Reuters, PTI).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <HelpCircle className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">
                    Tier 4: Other / Unverified
                  </span>
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Blogs, forum posts, unverified social media claims. Never used as primary evidence for verdicts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
