import React from 'react';
import { FileDiff, CheckCircle2, AlertOctagon, ExternalLink, Tag } from 'lucide-react';
import type { AnalysisResult, DiffSpan, MutationType } from '@/lib/types';

const MUTATION_DESCRIPTIONS: Record<string, { label: string; meaning: string; color: string }> = {
  fabrication: {
    label: 'Fabrication',
    meaning: 'Completely invented information with no factual basis.',
    color: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800',
  },
  reframing: {
    label: 'Reframing',
    meaning: 'Takes real facts but spins or distorts their meaning.',
    color: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
  },
  exaggeration: {
    label: 'Exaggeration',
    meaning: 'Blows numbers, scale, or consequences out of proportion.',
    color: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
  },
  omission: {
    label: 'Omission',
    meaning: 'Leaves out crucial context that changes the full story.',
    color: 'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-800',
  },
  old_news: {
    label: 'Old News',
    meaning: 'Passes off past events as current breaking news.',
    color: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
  },
  false_context: {
    label: 'False Context',
    meaning: 'Combines real media/text with inaccurate time or location.',
    color: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800',
  },
};

function getMutationMeta(mut: MutationType | string) {
  const key = String(mut).toLowerCase().trim();
  if (MUTATION_DESCRIPTIONS[key]) return MUTATION_DESCRIPTIONS[key];
  return {
    label: mut.replace(/_/g, ' '),
    meaning: 'Distorts factual narrative.',
    color: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200',
  };
}

/**
 * Renders claim text highlighting diff_spans safely as plain string text elements.
 */
function renderDiffMessage(text: string, diffSpans?: DiffSpan[]): React.ReactNode {
  if (!text) return null;
  if (!diffSpans || diffSpans.length === 0) {
    return <span>{text}</span>;
  }

  interface DiffRange {
    start: number;
    end: number;
    text: string;
    note: string;
    type?: string;
  }

  const ranges: DiffRange[] = [];

  for (const ds of diffSpans) {
    let start = ds.start;
    let end = ds.end;
    const spanStr = ds.span;

    // If start and end are missing, search for spanStr in text
    if ((start === undefined || end === undefined) && spanStr) {
      const idx = text.toLowerCase().indexOf(spanStr.toLowerCase());
      if (idx !== -1) {
        start = idx;
        end = idx + spanStr.length;
      }
    }

    if (start !== undefined && end !== undefined && start < end && start >= 0 && end <= text.length) {
      ranges.push({
        start,
        end,
        text: text.substring(start, end),
        note: ds.note,
        type: ds.type,
      });
    }
  }

  if (ranges.length === 0) {
    return <span>{text}</span>;
  }

  ranges.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let currentIndex = 0;

  ranges.forEach((r, i) => {
    if (r.start > currentIndex) {
      nodes.push(
        <span key={`txt-${currentIndex}`}>{text.substring(currentIndex, r.start)}</span>
      );
    }
    nodes.push(
      <span
        key={`diff-${i}`}
        className="group relative inline rounded bg-red-100 px-1 py-0.5 font-medium text-red-950 underline decoration-red-400 decoration-2 dark:bg-red-950/70 dark:text-red-100 dark:decoration-red-500 cursor-help"
        title={r.note}
      >
        {r.text}
        {r.note && (
          <span className="ml-1 inline-flex items-center rounded bg-red-200 px-1 py-0.2 text-[10px] font-bold text-red-900 dark:bg-red-900 dark:text-red-100">
            {r.type || 'distortion'}
          </span>
        )}
      </span>
    );
    currentIndex = r.end;
  });

  if (currentIndex < text.length) {
    nodes.push(<span key="txt-end">{text.substring(currentIndex)}</span>);
  }

  return <>{nodes}</>;
}

export default function DiffView({ result }: { result: AnalysisResult }) {
  const claimText = result.claim || result.claim_text || result.cleaned_text || '';
  const verifiedFact = result.verified_fact;
  const mutations = result.mutations || [];
  const diffSpans = result.diff_spans || [];

  const verifiedText =
    verifiedFact?.text || verifiedFact?.details || verifiedFact?.summary || null;
  const evidenceIds = verifiedFact?.evidence_ids || ['E1'];

  const scrollToSource = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    const target = document.getElementById(cleanId) || document.getElementById(`source-${cleanId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
        <FileDiff className="h-6 w-6 text-teal-600 dark:text-teal-400" />
        <h2 className="text-lg font-bold tracking-tight">
          Side-by-Side Reality Check
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Comparing the message claims against verified evidence.
      </p>

      {/* Mutation Chips */}
      {mutations.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Tag className="h-3.5 w-3.5" /> Distortion Patterns:
          </span>
          {mutations.map((mut, idx) => {
            const meta = getMutationMeta(mut);
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.color}`}
                title={meta.meaning}
              >
                <span>{meta.label}</span>
                <span className="text-[10px] opacity-75">({meta.meaning})</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Side-by-side (desktop) / Stacked (mobile) */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Left Column: What the message says */}
        <div className="flex flex-col rounded-xl border border-red-200/80 bg-red-50/40 p-5 dark:border-red-900/40 dark:bg-red-950/10">
          <div className="flex items-center justify-between border-b border-red-200/60 pb-3 dark:border-red-900/30">
            <div className="flex items-center gap-2 text-red-900 dark:text-red-300">
              <AlertOctagon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                What the Message Says
              </h3>
            </div>
            {diffSpans.length > 0 && (
              <span className="text-[11px] font-medium text-red-700 dark:text-red-400">
                {diffSpans.length} distortion point{diffSpans.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="mt-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
            {claimText ? (
              renderDiffMessage(claimText, diffSpans)
            ) : (
              <span className="italic text-slate-400">No message text provided.</span>
            )}
          </div>

          {/* Notes summary for diff spans */}
          {diffSpans.length > 0 && (
            <div className="mt-4 border-t border-red-200/60 pt-3 dark:border-red-900/30">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-800 dark:text-red-400 mb-1.5">
                Distortion Notes:
              </h4>
              <ul className="space-y-1 text-xs text-red-900 dark:text-red-300">
                {diffSpans.map((ds, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span>{ds.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: What is verified */}
        <div className="flex flex-col rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                What is Verified
              </h3>
            </div>
            {evidenceIds.length > 0 && (
              <div className="flex items-center gap-1">
                {evidenceIds.map((eid, i) => (
                  <a
                    key={i}
                    href={`#source-${eid}`}
                    onClick={(e) => scrollToSource(e, eid)}
                    className="inline-flex items-center gap-0.5 rounded bg-emerald-200 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900 transition-colors hover:bg-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:hover:bg-emerald-800"
                    title={`Jump to source ${eid}`}
                  >
                    <span>{eid}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-normal">
            {verifiedText ? (
              <div>
                <p>{verifiedText}</p>
                {evidenceIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-semibold">Evidence Citations:</span>
                    {evidenceIds.map((eid, i) => (
                      <a
                        key={i}
                        href={`#source-${eid}`}
                        onClick={(e) => scrollToSource(e, eid)}
                        className="inline-flex items-center gap-1 underline font-semibold hover:text-emerald-950 dark:hover:text-emerald-100"
                      >
                        [{eid}]
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-white/70 p-4 text-xs italic text-slate-500 shadow-2xs dark:bg-slate-900/60 dark:text-slate-400">
                No single verified fact statement is available for this claim. See cited sources below for context.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
