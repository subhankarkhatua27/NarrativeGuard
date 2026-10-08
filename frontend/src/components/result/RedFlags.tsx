import React from 'react';
import { Flag, AlertCircle, Zap } from 'lucide-react';
import type { AnalysisResult, RedFlag } from '@/lib/types';

const TACTIC_DESCRIPTIONS: Record<string, string> = {
  urgency: 'Pushes immediate sharing before you have time to double check.',
  fear: 'Appeals to danger, panic, or loss to bypass critical thinking.',
  'fake authority': 'Claims official approval or unnamed insider sources without proof.',
  fake_authority: 'Claims official approval or unnamed insider sources without proof.',
  'fake document': 'Uses fabricated papers, altered letters, or fake seals.',
  fake_document: 'Uses fabricated papers, altered letters, or fake seals.',
  'emotional appeal': 'Uses strong outrage or sentiment to spark viral reactions.',
  emotional_appeal: 'Uses strong outrage or sentiment to spark viral reactions.',
  'forward-this-now': 'Explicitly demands forwarding to friends or WhatsApp groups.',
  forward_this_now: 'Explicitly demands forwarding to friends or WhatsApp groups.',
  'vague source': "Uses non-specific references like 'sources say' or 'doctors confirm'.",
  vague_source: "Uses non-specific references like 'sources say' or 'doctors confirm'.",
  'miracle claim': 'Promises unbelievable shortcuts, guaranteed cures, or free money.',
  miracle_claim: 'Promises unbelievable shortcuts, guaranteed cures, or free money.',
  'us-vs-them': 'Creates tribal division or frames an enemy to provoke anger.',
  us_vs_them: 'Creates tribal division or frames an enemy to provoke anger.',
  official_sounding: 'Employs jargon or bureaucratic titles to sound authoritative.',
  viral_pattern: 'Repeats a well-known viral chain message pattern.',
  no_primary_source: 'Lacks verifiable primary links or citation metrics.',
};

function getTacticExplanation(tacticOrType?: string): string {
  if (!tacticOrType) return 'Uses psychological persuasion tactics to encourage sharing.';
  const key = tacticOrType.toLowerCase().trim();
  if (TACTIC_DESCRIPTIONS[key]) return TACTIC_DESCRIPTIONS[key];
  const formattedKey = key.replace(/_/g, ' ');
  if (TACTIC_DESCRIPTIONS[formattedKey]) return TACTIC_DESCRIPTIONS[formattedKey];
  return 'Employs manipulative framing to influence reader perception.';
}

function formatTacticTitle(tacticOrType?: string): string {
  if (!tacticOrType) return 'Red Flag Pattern';
  return tacticOrType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Safely breaks fullText into highlighted spans without dangerouslySetInnerHTML.
 */
function renderHighlightedMessage(fullText: string, redFlags: RedFlag[]): React.ReactNode {
  if (!fullText) return null;
  if (!redFlags || redFlags.length === 0) {
    return <span className="text-slate-800 dark:text-slate-200">{fullText}</span>;
  }

  // Find non-overlapping occurrences of spans in fullText
  interface TargetSpan {
    start: number;
    end: number;
    text: string;
    tactic: string;
  }

  const spansToHighlight: TargetSpan[] = [];

  for (const flag of redFlags) {
    const searchTarget = flag.span || flag.text;
    if (!searchTarget || searchTarget.length < 3) continue;

    const lowerFull = fullText.toLowerCase();
    const lowerSearch = searchTarget.toLowerCase();
    const idx = lowerFull.indexOf(lowerSearch);

    if (idx !== -1) {
      const start = idx;
      const end = idx + searchTarget.length;
      // Check overlap with existing spans
      const overlaps = spansToHighlight.some(
        (s) => Math.max(s.start, start) < Math.min(s.end, end)
      );
      if (!overlaps) {
        spansToHighlight.push({
          start,
          end,
          text: fullText.substring(start, end),
          tactic: formatTacticTitle(flag.tactic || flag.type),
        });
      }
    }
  }

  if (spansToHighlight.length === 0) {
    return <span className="text-slate-800 dark:text-slate-200">{fullText}</span>;
  }

  // Sort spans by start index
  spansToHighlight.sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let currentIndex = 0;

  spansToHighlight.forEach((sp, i) => {
    if (sp.start > currentIndex) {
      nodes.push(
        <span key={`text-${currentIndex}`}>
          {fullText.substring(currentIndex, sp.start)}
        </span>
      );
    }
    nodes.push(
      <mark
        key={`highlight-${i}`}
        className="mx-0.5 rounded border-b-2 border-amber-500 bg-amber-200/90 px-1 py-0.5 font-semibold text-amber-950 shadow-2xs dark:border-amber-400 dark:bg-amber-900/60 dark:text-amber-100"
        title={`Red Flag: ${sp.tactic}`}
      >
        {sp.text}
      </mark>
    );
    currentIndex = sp.end;
  });

  if (currentIndex < fullText.length) {
    nodes.push(
      <span key={`text-end`}>{fullText.substring(currentIndex)}</span>
    );
  }

  return <>{nodes}</>;
}

export default function RedFlags({ result }: { result: AnalysisResult }) {
  const flags = result.red_flags || [];
  const messageText = result.claim || result.claim_text || result.cleaned_text || '';

  if (flags.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-orange-50/40 p-6 sm:p-8 shadow-2xs dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/10">
      <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
        <Flag className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        <h2 className="text-lg font-bold tracking-tight">
          How this message tries to convince you
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        We identified {flags.length} persuasion tactic{flags.length > 1 ? 's' : ''} in the analyzed content.
      </p>

      {/* Message with highlighted spans */}
      {messageText && (
        <div className="mt-5 rounded-xl border border-amber-200/70 bg-white/90 p-4 font-normal text-sm leading-relaxed shadow-2xs dark:border-amber-900/50 dark:bg-slate-900/90">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            Highlighted Message Spans
          </div>
          <div className="text-slate-800 dark:text-slate-200">
            {renderHighlightedMessage(messageText, flags)}
          </div>
        </div>
      )}

      {/* Tactic lookup chips + 1-line explanations */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {flags.map((flag, idx) => {
          const tacticName = flag.tactic || flag.type || 'Persuasion Tactic';
          const title = formatTacticTitle(tacticName);
          const explanation = getTacticExplanation(tacticName);
          const spanText = flag.span || flag.text;

          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white/90 p-4 shadow-2xs transition-all hover:border-amber-300 dark:border-amber-900/40 dark:bg-slate-900/80"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200">
                    <AlertCircle className="h-3 w-3 text-amber-700 dark:text-amber-400" />
                    {title}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  {explanation}
                </p>
              </div>

              {spanText && (
                <div className="mt-3 border-t border-amber-100 dark:border-slate-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Target Phrase: </span>
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
