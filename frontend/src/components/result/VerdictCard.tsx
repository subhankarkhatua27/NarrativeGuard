import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Clock,
  HelpCircle,
  AlertCircle,
  FileText,
  Calendar,
  Quote,
  RefreshCw,
  AlertTriangle,
  Tag,
} from 'lucide-react';
import type { AnalysisResult, MutationType, VerdictKey } from '@/lib/types';

interface VerdictConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  border: string;
  badgeBg: string;
  textColor: string;
  badgeText: string;
}

const VERDICT_CONFIGS: Record<VerdictKey, VerdictConfig> = {
  contradicted: {
    label: 'Contradicted',
    icon: ShieldX,
    bg: 'bg-red-50/90',
    border: 'border-red-200',
    badgeBg: 'bg-red-600 text-white',
    textColor: 'text-red-950',
    badgeText: 'Proven False',
  },
  misleading: {
    label: 'Misleading',
    icon: ShieldAlert,
    bg: 'bg-amber-50/90',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
    textColor: 'text-amber-950',
    badgeText: 'Context Missing',
  },
  disputed: {
    label: 'Disputed',
    icon: AlertCircle,
    bg: 'bg-purple-50/90',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-600 text-white',
    textColor: 'text-purple-950',
    badgeText: 'Conflicting Sources',
  },
  too_new: {
    label: 'Too New to Verify',
    icon: Clock,
    bg: 'bg-blue-50/90',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
    textColor: 'text-blue-950',
    badgeText: 'Developing Story',
  },
  unverifiable: {
    label: 'Unverifiable',
    icon: HelpCircle,
    bg: 'bg-slate-50/90',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-600 text-white',
    textColor: 'text-slate-900',
    badgeText: 'Insufficient Proof',
  },
  supported: {
    label: 'Supported',
    icon: ShieldCheck,
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-950',
    badgeText: 'Verified True',
  },
  not_checkable: {
    label: 'Not Checkable',
    icon: FileText,
    bg: 'bg-neutral-50/90',
    border: 'border-neutral-200',
    badgeBg: 'bg-neutral-600 text-white',
    textColor: 'text-neutral-900',
    badgeText: 'Opinion / Personal',
  },
};

const MUTATION_CHIPS: Record<string, { label: string; color: string }> = {
  fabrication: {
    label: 'Fabrication',
    color: 'bg-red-100 text-red-900 border-red-300',
  },
  reframing: {
    label: 'Reframing',
    color: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  exaggeration: {
    label: 'Exaggeration',
    color: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  omission: {
    label: 'Omission',
    color: 'bg-orange-100 text-orange-900 border-orange-300',
  },
  old_news: {
    label: 'Old news',
    color: 'bg-blue-100 text-blue-900 border-blue-300',
  },
  false_context: {
    label: 'False context',
    color: 'bg-rose-100 text-rose-900 border-rose-300',
  },
};

const DEFAULT_CONFIG: VerdictConfig = VERDICT_CONFIGS.unverifiable;

function resolveVerdictKey(result: AnalysisResult): VerdictKey {
  const key = (result.verdict_key || '').toLowerCase() as VerdictKey;
  if (key && VERDICT_CONFIGS[key]) {
    return key;
  }
  const v = (result.verdict || '').toLowerCase();
  if (v.includes('contradict') || v.includes('false')) return 'contradicted';
  if (v.includes('mislead')) return 'misleading';
  if (v.includes('dispute')) return 'disputed';
  if (v.includes('too new') || v.includes('too_new')) return 'too_new';
  if (v.includes('support') || v.includes('true')) return 'supported';
  if (v.includes('not checkable') || v.includes('not_checkable')) return 'not_checkable';
  return 'unverifiable';
}

function getAdviceStyles(advice: string): { bg: string; text: string } {
  const norm = advice.toLowerCase();
  if (norm.includes("don't forward") || norm.includes('dont forward') || norm.includes('do not')) {
    return { bg: 'bg-red-600 text-white shadow-sm shadow-red-200', text: advice };
  }
  if (norm.includes('wait')) {
    return { bg: 'bg-amber-600 text-white shadow-sm shadow-amber-200', text: advice };
  }
  if (norm.includes('safe to share')) {
    return { bg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200', text: advice };
  }
  if (norm.includes('opinion')) {
    return { bg: 'bg-purple-600 text-white shadow-sm shadow-purple-200', text: advice };
  }
  return { bg: 'bg-slate-700 text-white shadow-sm', text: advice };
}

function formatAsOf(asOfStr?: string): string | null {
  if (!asOfStr) return null;
  try {
    const d = new Date(asOfStr);
    if (isNaN(d.getTime())) return asOfStr;
    return `${d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return asOfStr;
  }
}

function mutationChip(mut: MutationType | string) {
  const key = String(mut).toLowerCase().trim();
  if (MUTATION_CHIPS[key]) return MUTATION_CHIPS[key];
  return {
    label: String(mut).replace(/_/g, ' '),
    color: 'bg-slate-100 text-slate-800 border-slate-300',
  };
}

export default function VerdictCard({ result }: { result: AnalysisResult }) {
  const key = resolveVerdictKey(result);
  const config = VERDICT_CONFIGS[key] || DEFAULT_CONFIG;
  const Icon = config.icon;

  const displayVerdict = result.verdict || config.label;
  const claimText = result.claim || '';
  const formattedTime = formatAsOf(result.as_of);
  const mutations = result.mutations || [];
  const advice = result.advice?.trim() ? getAdviceStyles(result.advice) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-6 sm:p-8 shadow-sm transition-all`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.badgeBg} shadow-sm`}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={`text-2xl font-extrabold tracking-tight ${config.textColor}`}>
                {displayVerdict}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeBg}`}
              >
                {config.badgeText}
              </span>
            </div>
            {formattedTime && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                As of {formattedTime}
              </p>
            )}
          </div>
        </div>

        {advice && (
          <span
            className={`inline-flex items-center self-start rounded-full px-4 py-2 text-xs font-bold ${advice.bg}`}
          >
            {advice.text}
          </span>
        )}
      </div>

      {result.old_news === 'possibly_old' && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-100/90 p-3.5 text-xs text-amber-950 shadow-2xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div>
            <span className="font-bold">Possibly old news:</span> This message may recycle an older event or publication out of context.
            {result.earliest_date ? ` Earliest date seen: ${result.earliest_date}.` : ''}
          </div>
        </div>
      )}

      {mutations.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Tag className="h-3.5 w-3.5" /> How it was twisted
          </span>
          {mutations.map((mut, idx) => {
            const meta = mutationChip(mut);
            return (
              <span
                key={idx}
                className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.color}`}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {claimText && (
        <div className="mt-6 rounded-xl border border-slate-200/80 bg-white/90 p-4.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            <Quote className="h-3.5 w-3.5 text-slate-400" />
            Claim
          </div>
          <p className="text-sm font-medium italic text-slate-800 leading-relaxed">
            "{claimText}"
          </p>
        </div>
      )}

      {result.basis && (
        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Fact-Check Assessment
          </h2>
          <p className="mt-2 text-base leading-relaxed font-normal text-slate-900">
            {result.basis}
          </p>
        </div>
      )}

      {result.what_would_change && (
        <div className="mt-7 border-t border-slate-200/60 pt-6">
          <div className="rounded-xl bg-white/80 p-4 border border-slate-200/60">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
              What would change this verdict
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">
              {result.what_would_change}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
