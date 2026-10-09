import { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Newspaper,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AnalysisResult, Source } from '@/lib/types';
import SourceTierLegend from './SourceTierLegend';

function getNumericTier(tierVal?: number): number {
  if (typeof tierVal === 'number' && tierVal >= 1 && tierVal <= 4) return tierVal;
  return 3;
}

function isHttpUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getTierMeta(tierNum: number) {
  switch (tierNum) {
    case 1:
      return {
        label: 'Tier 1: Official',
        icon: ShieldCheck,
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
      };
    case 2:
      return {
        label: 'Tier 2: Fact-Checker',
        icon: CheckCircle2,
        badge: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-800',
      };
    case 3:
      return {
        label: 'Tier 3: News',
        icon: Newspaper,
        badge: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
      };
    default:
      return {
        label: 'Tier 4: Other',
        icon: HelpCircle,
        badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

function getRelationMeta(relation?: string) {
  const norm = (relation || '').toLowerCase().trim();
  if (norm === 'supports') {
    return {
      label: 'Supports',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
      icon: '✅',
    };
  }
  if (norm === 'contradicts') {
    return {
      label: 'Contradicts',
      badge: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800',
      icon: '❌',
    };
  }
  if (norm === 'background') {
    return {
      label: 'Background',
      badge: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
      icon: 'ℹ️',
    };
  }
  return {
    label: 'Unrelated',
    badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: '⚪',
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function SourcesPanel({ result }: { result: AnalysisResult }) {
  const sources = result.sources || [];
  const [showUnrelated, setShowUnrelated] = useState(false);

  if (sources.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
            <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-bold tracking-tight">Cited Sources & Evidence</h2>
          </div>
          <SourceTierLegend />
        </div>
        <p className="mt-4 text-xs italic text-slate-500">No external source links available for this check.</p>
      </div>
    );
  }

  // Sort sources by tier then date
  const sortedSources = [...sources].sort((a, b) => {
    const tierA = getNumericTier(a.tier);
    const tierB = getNumericTier(b.tier);
    if (tierA !== tierB) return tierA - tierB;
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  // Check for disagreement
  const hasSupporting = sortedSources.some((s) => (s.relation || '').toLowerCase() === 'supports');
  const hasContradicting = sortedSources.some((s) => (s.relation || '').toLowerCase() === 'contradicts');
  const hasDisagreement = hasSupporting && hasContradicting;

  // Filter out unrelated unless toggled
  const relevantSources = sortedSources.filter((s) => {
    const rel = (s.relation || '').toLowerCase();
    return rel === 'supports' || rel === 'contradicts' || rel === 'background';
  });

  const unrelatedSources = sortedSources.filter((s) => {
    const rel = (s.relation || '').toLowerCase();
    return rel !== 'supports' && rel !== 'contradicts' && rel !== 'background';
  });

  const displayedSources = showUnrelated
    ? sortedSources
    : relevantSources.length > 0
    ? relevantSources
    : sortedSources;

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header with Title and Tier Info Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
          <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          <div>
            <h2 className="text-lg font-bold tracking-tight">Cited Sources & Evidence</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sources.length} cited reference{sources.length > 1 ? 's' : ''} sorted by tier and publication date.
            </p>
          </div>
        </div>
        <SourceTierLegend />
      </div>

      {/* Disagreement Warning Banner */}
      {hasDisagreement && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-purple-300 bg-purple-50 p-4 text-xs text-purple-950 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-200 shadow-2xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <span className="font-bold">⚠️ Conflicting Sources Detected:</span> Some cited sources support parts of this claim while others contradict it. Please review the detailed citations below.
          </div>
        </div>
      )}

      {/* Source Cards List */}
      <div className="mt-6 space-y-4">
        {displayedSources.map((source, index) => {
          const tierNum = getNumericTier(source.tier);
          const tierMeta = getTierMeta(tierNum);
          const relMeta = getRelationMeta(source.relation);
          const TierIcon = tierMeta.icon;
          const formattedDate = formatDate(source.date);
          const anchorId = source.id ? `source-${source.id}` : `source-E${index + 1}`;

          return (
            <div
              key={index}
              id={anchorId}
              className="group relative rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 transition-all hover:border-teal-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-teal-900 dark:hover:bg-slate-800/60 target:ring-2 target:ring-teal-500 target:ring-offset-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3 dark:border-slate-700/50">
                {/* ID badge & Tier badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center rounded-md bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-900 dark:bg-teal-950 dark:text-teal-200">
                    {source.id || `E${index + 1}`}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${tierMeta.badge}`}
                  >
                    <TierIcon className="h-3 w-3" />
                    {tierMeta.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${relMeta.badge}`}
                  >
                    <span>{relMeta.icon}</span>
                    <span>{relMeta.label}</span>
                  </span>
                </div>

                {/* Date */}
                {formattedDate && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formattedDate}
                  </span>
                )}
              </div>

              {/* Publisher & External Title */}
              <div className="mt-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {source.publisher || source.domain || 'Source Publisher'}
                </div>
                {isHttpUrl(source.url) ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-base font-bold text-slate-900 hover:text-teal-600 dark:text-slate-100 dark:hover:text-teal-400 transition-colors"
                  >
                    <span>{source.title || source.url}</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400" />
                  </a>
                ) : (
                  <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
                    {source.title || source.domain || 'Untitled source'}
                  </p>
                )}
              </div>

              {/* Quoted Snippet */}
              {source.snippet && (
                <blockquote className="mt-3 rounded-lg border-l-3 border-teal-500 bg-white p-3.5 text-xs italic leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-300 shadow-2xs">
                  "{source.snippet}"
                </blockquote>
              )}
            </div>
          );
        })}
      </div>

      {/* Unrelated sources toggle if present */}
      {unrelatedSources.length > 0 && relevantSources.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowUnrelated(!showUnrelated)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
          >
            <span>
              {showUnrelated
                ? 'Hide neutral / background references'
                : `Show ${unrelatedSources.length} additional reference${unrelatedSources.length > 1 ? 's' : ''}`}
            </span>
            {showUnrelated ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
