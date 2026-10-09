import React from 'react';
import { Flag, AlertCircle } from 'lucide-react';
import type { AnalysisResult, RedFlag } from '@/lib/types';

const TACTIC_DESCRIPTIONS: Record<string, string> = {
  urgency: 'Pushes immediate sharing before you have time to double check.',
  fear: 'Appeals to danger, panic, or loss to bypass critical thinking.',
  'fake authority': 'Claims official approval or unnamed insider sources without proof.',
  fake_authority: 'Claims official approval or unnamed insider sources without proof.',
  'fake document': 'Uses fabricated papers, altered letters, or fake seals.',
  'emotional appeal': 'Uses strong outrage or sentiment to spark viral reactions.',
  'forward-this-now': 'Explicitly demands forwarding to friends or WhatsApp groups.',
  'vague source': "Uses non-specific references like 'sources say' or 'doctors confirm'.",
  'miracle claim': 'Promises unbelievable shortcuts, guaranteed cures, or free money.',
};

function getTacticExplanation(tactic?: string): string {
  if (!tactic) return 'Uses psychological persuasion tactics to encourage sharing.';
  const key = tactic.toLowerCase().trim();
  if (TACTIC_DESCRIPTIONS[key]) return TACTIC_DESCRIPTIONS[key];
  const formattedKey = key.replace(/_/g, ' ');
  if (TACTIC_DESCRIPTIONS[formattedKey]) return TACTIC_DESCRIPTIONS[formattedKey];
  return 'Employs manipulative framing to influence reader perception.';
}

function formatTacticTitle(tactic?: string): string {
  if (!tactic) return 'Red flag';
  return tactic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderHighlightedMessage(fullText: string, redFlags: RedFlag[]): React.ReactNode {
  if (!fullText) return null;
  if (!redFlags || redFlags.length === 0) {
    return <span className="text-slate-800">{fullText}</span>;
  }

  interface TargetSpan {
    start: number;
    end: number;
    text: string;
    tactic: string;
  }

  const spansToHighlight: TargetSpan[] = [];

  for (const flag of redFlags) {
    const searchTarget = flag.span;
    if (!searchTarget || searchTarget.length < 2) continue;

    const lowerFull = fullText.toLowerCase();
    const lowerSearch = searchTarget.toLowerCase();
    const idx = lowerFull.indexOf(lowerSearch);

    if (idx !== -1) {
      const start = idx;
      const end = idx + searchTarget.length;
      const overlaps = spansToHighlight.some(
        (s) => Math.max(s.start, start) < Math.min(s.end, end),
      );
      if (!overlaps) {
        spansToHighlight.push({
          start,
          end,
          text: fullText.substring(start, end),
          tactic: formatTacticTitle(flag.tactic),
        });
      }
    }
  }

  if (spansToHighlight.length === 0) {
    return <span className="text-slate-800">{fullText}</span>;
  }

  spansToHighlight.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let currentIndex = 0;

  spansToHighlight.forEach((sp, i) => {
    if (sp.start > currentIndex) {
      nodes.push(
        <span key={`text-${currentIndex}`}>
          {fullText.substring(currentIndex, sp.start)}
        </span>,
      );
    }
    nodes.push(
      <mark
        key={`highlight-${i}`}
        className="mx-0.5 rounded border-b-2 border-amber-500 bg-amber-200/90 px-1 py-0.5 font-semibold text-amber-950 shadow-2xs"
        title={`Red Flag: ${sp.tactic}`}
      >
        {sp.text}
      </mark>,
    );
    currentIndex = sp.end;
  });

  if (currentIndex < fullText.length) {
    nodes.push(<span key="text-end">{fullText.substring(currentIndex)}</span>);
  }

  return <>{nodes}</>;
}

export default function RedFlags({
  result,
  originalText,
}: {
  result: AnalysisResult;
  originalText?: string | null;
}) {
  const flags = result.red_flags || [];

  if (flags.length === 0) {
    return null;
  }

  const messageText = originalText?.trim() || '';

  return (
    <div className="mt-8 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-orange-50/40 p-6 sm:p-8 shadow-2xs">
      <div className="flex items-center gap-2.5 text-amber-900">
        <Flag className="h-6 w-6 text-amber-600" />
        <h2 className="text-lg font-bold tracking-tight">
          How this message tries to convince you
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        We identified {flags.length} persuasion tactic{flags.length > 1 ? 's' : ''} in the analyzed content.
      </p>

      {messageText ? (
        <div className="mt-5 rounded-xl border border-amber-200/70 bg-white/90 p-4 font-normal text-sm leading-relaxed shadow-2xs">
          <div className="text-slate-800">{renderHighlightedMessage(messageText, flags)}</div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {flags.map((flag, idx) => {
          const title = formatTacticTitle(flag.tactic);
          const explanation = getTacticExplanation(flag.tactic);
          const spanText = flag.span;

          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-2xs"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                    <AlertCircle className="h-3 w-3 text-amber-700" />
                    {title}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700 leading-relaxed">
                  {explanation}
                </p>
              </div>

              {spanText && (
                <div className="mt-3 border-t border-amber-100 pt-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-600">Phrase: </span>
                  <span className="italic">"{spanText}"</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
