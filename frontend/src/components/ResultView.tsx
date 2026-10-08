import type { AnalysisResult } from '@/lib/types';
import VerdictCard from './result/VerdictCard';
import RedFlags from './result/RedFlags';
import DiffView from './result/DiffView';
import SourcesPanel from './result/SourcesPanel';

interface ResultViewProps {
  result?: AnalysisResult | null;
}

export default function ResultView({ result }: ResultViewProps) {
  if (!result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            No analysis result available.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Please submit a message to view the detailed fact-check report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      {/* 1. Verdict Card */}
      <VerdictCard result={result} />

      {/* 2. Red Flags & Manipulation Tactics */}
      <RedFlags result={result} />

      {/* 3. Side-by-Side Diff View */}
      <DiffView result={result} />

      {/* 4. Sources Panel (includes 5. SourceTierLegend popover) */}
      <SourcesPanel result={result} />
    </div>
  );
}
