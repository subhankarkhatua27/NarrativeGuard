import type { AnalysisResult } from '@/lib/types';
import VerdictCard from './result/VerdictCard';
import RedFlags from './result/RedFlags';
import DiffView from './result/DiffView';
import SourcesPanel from './result/SourcesPanel';

interface ResultViewProps {
  result?: AnalysisResult | null;
  originalText?: string | null;
}

export default function ResultView({ result, originalText }: ResultViewProps) {
  if (!result) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
          <p className="text-base font-semibold text-slate-700">
            No analysis result available.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Please submit a message to view the detailed fact-check report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
      <VerdictCard result={result} />
      <RedFlags result={result} originalText={originalText} />
      <DiffView result={result} originalText={originalText} />
      <SourcesPanel result={result} />
    </div>
  );
}
