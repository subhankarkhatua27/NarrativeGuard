import { ShieldCheck, ShieldAlert, ShieldX, Clock, HelpCircle } from 'lucide-react';
import type { AnalysisResult, Verdict } from '@/lib/types';

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; icon: typeof ShieldCheck; color: string; bg: string; border: string }
> = {
  contradicted: {
    label: 'Contradicted',
    icon: ShieldX,
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  misleading: {
    label: 'Misleading',
    icon: ShieldAlert,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  too_new: {
    label: "Can't verify yet",
    icon: Clock,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  unverifiable: {
    label: "Can't verify",
    icon: HelpCircle,
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
};

interface ResultViewProps {
  result: AnalysisResult;
}

export default function ResultView({ result }: ResultViewProps) {
  const config = VERDICT_CONFIG[result.verdict];
  const Icon = config.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Verdict badge */}
      <div className={`flex items-center gap-3 rounded-2xl border ${config.border} ${config.bg} px-5 py-4`}>
        <Icon className={`h-7 w-7 shrink-0 ${config.color}`} />
        <div>
          <p className={`text-lg font-bold ${config.color}`}>{config.label}</p>
          <p className="text-xs text-slate-500">
            Confidence: {Math.round(result.confidence * 100)}%
          </p>
        </div>
      </div>

      {/* Basis */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Basis
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          {result.basis}
        </p>
      </div>

      {/* Placeholder for future content */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Full analysis details will appear here.
      </p>
    </div>
  );
}
