import React from 'react';
import { FileDiff, CheckCircle2, AlertOctagon, ExternalLink } from 'lucide-react';
import type { AnalysisResult, DiffSpan } from '@/lib/types';

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
  }

  const ranges: DiffRange[] = [];

  for (const ds of diffSpans) {
    const spanStr = ds.span;
    if (!spanStr) continue;
    const idx = text.toLowerCase().indexOf(spanStr.toLowerCase());
    if (idx === -1) continue;
    const start = idx;
    const end = idx + spanStr.length;
    if (start < end && start >= 0 && end <= text.length) {
      ranges.push({
        start,
        end,
        text: text.substring(start, end),
        note: ds.note || '',
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
        <span key={`txt-${currentIndex}`}>{text.substring(currentIndex, r.start)}</span>,
      );
    }
    nodes.push(
      <span
        key={`diff-${i}`}
        className="group relative inline rounded bg-red-100 px-1 py-0.5 font-medium text-red-950 underline decoration-red-400 decoration-2 cursor-help"
        title={r.note}
      >
        {r.text}
      </span>,
    );
    currentIndex = r.end;
  });

  if (currentIndex < text.length) {
    nodes.push(<span key="txt-end">{text.substring(currentIndex)}</span>);
  }

  return <>{nodes}</>;
}

export default function DiffView({
  result,
  originalText,
}: {
  result: AnalysisResult;
  originalText?: string | null;
}) {
  const messageText = originalText?.trim() || result.claim || '';
  const verifiedFact = result.verified_fact;
  const diffSpans = result.diff_spans || [];

  const verifiedText = verifiedFact?.text || null;
  const evidenceIds = verifiedFact?.evidence_ids || [];

  const scrollToSource = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    const target = document.getElementById(cleanId) || document.getElementById(`source-${cleanId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const hasContent = messageText || verifiedText || diffSpans.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
      <div className="flex items-center gap-2.5 text-slate-900">
        <FileDiff className="h-6 w-6 text-teal-600" />
        <h2 className="text-lg font-bold tracking-tight">
          Side-by-Side Reality Check
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Comparing the message against verified evidence.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-red-200/80 bg-red-50/40 p-5">
          <div className="flex items-center justify-between border-b border-red-200/60 pb-3">
            <div className="flex items-center gap-2 text-red-900">
              <AlertOctagon className="h-4 w-4 text-red-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                What the Message Says
              </h3>
            </div>
            {diffSpans.length > 0 && (
              <span className="text-[11px] font-medium text-red-700">
                {diffSpans.length} distortion point{diffSpans.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="mt-3 text-sm leading-relaxed text-slate-800 font-normal">
            {messageText ? (
              renderDiffMessage(messageText, diffSpans)
            ) : (
              <ul className="space-y-1 text-xs text-red-900">
                {diffSpans.map((ds, i) => (
                  <li key={i}>
                    {ds.span ? <span className="font-semibold">"{ds.span}" — </span> : null}
                    {ds.note}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {messageText && diffSpans.length > 0 && (
            <div className="mt-4 border-t border-red-200/60 pt-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-800 mb-1.5">
                Distortion Notes:
              </h4>
              <ul className="space-y-1 text-xs text-red-900">
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

        <div className="flex flex-col rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5">
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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
                    className="inline-flex items-center gap-0.5 rounded bg-emerald-200 px-1.5 py-0.5 text-[11px] font-bold text-emerald-900 transition-colors hover:bg-emerald-300"
                    title={`Jump to source ${eid}`}
                  >
                    <span>{eid}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 text-sm leading-relaxed text-slate-800 font-normal">
            {verifiedText ? (
              <div>
                <p>{verifiedText}</p>
                {evidenceIds.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-emerald-800">
                    <span className="font-semibold">Evidence:</span>
                    {evidenceIds.map((eid, i) => (
                      <a
                        key={i}
                        href={`#source-${eid}`}
                        onClick={(e) => scrollToSource(e, eid)}
                        className="inline-flex items-center gap-1 underline font-semibold hover:text-emerald-950"
                      >
                        [{eid}]
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-white/70 p-4 text-xs italic text-slate-500 shadow-2xs">
                No single verified fact statement is available for this claim. See cited sources below for context.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
