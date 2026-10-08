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
  Info,
} from 'lucide-react';
import type { AnalysisResult, VerdictKey } from '@/lib/types';

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
    bg: 'bg-red-50/90 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-900/50',
    badgeBg: 'bg-red-600 text-white',
    textColor: 'text-red-950 dark:text-red-200',
    badgeText: 'Proven False',
  },
  misleading: {
    label: 'Misleading',
    icon: ShieldAlert,
    bg: 'bg-amber-50/90 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-900/50',
    badgeBg: 'bg-amber-600 text-white',
    textColor: 'text-amber-950 dark:text-amber-200',
    badgeText: 'Context Missing',
  },
  disputed: {
    label: 'Disputed',
    icon: AlertCircle,
    bg: 'bg-purple-50/90 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-900/50',
    badgeBg: 'bg-purple-600 text-white',
    textColor: 'text-purple-950 dark:text-purple-200',
    badgeText: 'Conflicting Sources',
  },
  too_new: {
    label: 'Too New to Verify',
    icon: Clock,
    bg: 'bg-blue-50/90 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-900/50',
    badgeBg: 'bg-blue-600 text-white',
    textColor: 'text-blue-950 dark:text-blue-200',
    badgeText: 'Developing Story',
  },
  unverifiable: {
    label: 'Unverifiable',
    icon: HelpCircle,
    bg: 'bg-slate-50/90 dark:bg-slate-900/50',
    border: 'border-slate-200 dark:border-slate-800',
    badgeBg: 'bg-slate-600 text-white',
    textColor: 'text-slate-900 dark:text-slate-200',
    badgeText: 'Insufficient Proof',
  },
  supported: {
    label: 'Supported',
    icon: ShieldCheck,
    bg: 'bg-emerald-50/90 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-900/50',
    badgeBg: 'bg-emerald-600 text-white',
    textColor: 'text-emerald-950 dark:text-emerald-200',
    badgeText: 'Verified True',
  },
  not_checkable: {
    label: 'Not Checkable',
    icon: FileText,
    bg: 'bg-neutral-50/90 dark:bg-neutral-900/50',
    border: 'border-neutral-200 dark:border-neutral-800',
    badgeBg: 'bg-neutral-600 text-white',
    textColor: 'text-neutral-900 dark:text-neutral-200',
    badgeText: 'Opinion / Personal',
  },
};

const DEFAULT_CONFIG: VerdictConfig = VERDICT_CONFIGS.unverifiable;

function resolveVerdictKey(result: AnalysisResult): VerdictKey {
  if (result.verdict_key && VERDICT_CONFIGS[result.verdict_key]) {
    return result.verdict_key;
  }
  const v = (result.verdict || '').toLowerCase();
  if (v.includes('contradict') || v.includes('false')) return 'contradicted';
  if (v.includes('mislead')) return 'misleading';
  if (v.includes('dispute')) return 'disputed';
  if (v.includes('too new') || v.includes('new')) return 'too_new';
  if (v.includes('support') || v.includes('true')) return 'supported';
  if (v.includes('not checkable')) return 'not_checkable';
  return 'unverifiable';
}

function getAdviceStyles(advice?: string): { bg: string; text: string; icon: string } {
  const norm = (advice || '').toLowerCase();
  if (norm.includes("don't forward") || norm.includes('dont forward') || norm.includes('do not')) {
    return {
      bg: 'bg-red-600 text-white shadow-sm shadow-red-200',
      text: advice || "Don't forward",
      icon: '🛑',
    };
  }
  if (norm.includes('wait')) {
    return {
      bg: 'bg-amber-600 text-white shadow-sm shadow-amber-200',
      text: advice || 'Wait for verification',
      icon: '⏳',
    };
  }
  if (norm.includes('safe to share')) {
    return {
      bg: 'bg-emerald-600 text-white shadow-sm shadow-emerald-200',
      text: advice || 'Safe to share with source',
      icon: '✅',
    };
  }
  if (norm.includes('opinion')) {
    return {
      bg: 'bg-purple-600 text-white shadow-sm shadow-purple-200',
      text: advice || 'Share as opinion, not as fact',
      icon: '💬',
    };
  }
  return {
    bg: 'bg-slate-700 text-white shadow-sm',
    text: advice || 'Exercise caution before sharing',
    icon: '⚠️',
  };
}

function formatAsOf(asOfStr?: string, fallbackStr?: string): string {
  const dateVal = asOfStr || fallbackStr;
  if (!dateVal) {
    return new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    return `${d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return dateVal;
  }
}

export default function VerdictCard({ result }: { result: AnalysisResult }) {
  const key = resolveVerdictKey(result);
  const config = VERDICT_CONFIGS[key] || DEFAULT_CONFIG;
  const Icon = config.icon;

  const displayVerdict = result.verdict || config.label;
  const claimText = result.claim || result.claim_text || result.cleaned_text || '';
  const basisText = result.basis || 'No basis narrative provided for this evaluation.';
  const whatWouldChange =
    result.what_would_change ||
    'Official gazette notifications, primary government releases, or multi-source confirmation.';
  const adviceInfo = getAdviceStyles(result.advice);
  const formattedTime = formatAsOf(result.as_of, result.created_at);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-6 sm:p-8 shadow-sm transition-all`}
    >
      {/* Top Header: Verdict Icon, Label, Badge, As-of Time */}
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
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              As of {formattedTime}
            </p>
          </div>
        </div>

        {/* Confidence pill if present */}
        {typeof result.confidence === 'number' && (
          <div className="self-start sm:self-auto rounded-lg bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 border border-slate-200/60 dark:border-slate-700 backdrop-blur-sm text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            Confidence: {Math.round(result.confidence * 100)}%
          </div>
        )}
      </div>

      {/* Recycled / Old News Alert Chip */}
      {result.old_news === 'possibly_old' && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-100/90 dark:bg-amber-950/60 p-3.5 text-xs text-amber-950 dark:text-amber-200 shadow-2xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">⏰ Recycled Claim / Possibly Old News:</span> This message appears to recycle content from a past event or older publication. It may be circulating out of original context.
          </div>
        </div>
      )}

      {/* Claim in Quotes */}
      {claimText && (
        <div className="mt-6 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-4.5 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            <Quote className="h-3.5 w-3.5 text-slate-400" />
            Analyzed Message
          </div>
          <p className="text-sm font-medium italic text-slate-800 dark:text-slate-200 leading-relaxed">
            "{claimText}"
          </p>
        </div>
      )}

      {/* Basis Narrative */}
      <div className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Fact-Check Assessment
        </h2>
        <p className="mt-2 text-base leading-relaxed font-normal text-slate-900 dark:text-slate-100">
          {basisText}
        </p>
      </div>

      {/* Two-Column Block: What would change this & Advice */}
      <div className="mt-7 grid gap-4 border-t border-slate-200/60 dark:border-slate-800/80 pt-6 md:grid-cols-2">
        {/* Column 1: What would change this */}
        <div className="flex flex-col justify-between rounded-xl bg-white/80 dark:bg-slate-900/60 p-4 border border-slate-200/60 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              What Would Change This Verdict?
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              {whatWouldChange}
            </p>
          </div>
        </div>

        {/* Column 2: Advice Pill */}
        <div className="flex flex-col justify-between rounded-xl bg-white/80 dark:bg-slate-900/60 p-4 border border-slate-200/60 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <Info className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Actionable Guidance
            </div>
            <div className="mt-3 flex items-center">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${adviceInfo.bg}`}
              >
                <span>{adviceInfo.icon}</span>
                <span>{adviceInfo.text}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
