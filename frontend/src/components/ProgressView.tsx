import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { StageEvent, StageName } from '@/lib/types';

interface PipelineNode {
  stage: StageName;
  label: string;
  isSearch: boolean;
}

const PIPELINE: PipelineNode[] = [
  { stage: 'started', label: 'Reading the message', isSearch: false },
  { stage: 'claim_analysis', label: 'Classifying the claim', isSearch: false },
  { stage: 'factcheck_search', label: 'Searching fact-checks', isSearch: true },
  { stage: 'archive_search', label: 'Searching our archive', isSearch: true },
  { stage: 'news_search', label: 'Searching trusted news', isSearch: true },
  { stage: 'evidence_built', label: 'Weighing evidence', isSearch: false },
  { stage: 'evidence_check', label: 'Checking the evidence', isSearch: false },
  { stage: 'verdict', label: 'Deciding the verdict', isSearch: false },
];

type NodeStatus = 'pending' | 'active' | 'done';

interface ProgressViewProps {
  stages: Map<StageName, StageEvent>;
  activeStage: StageName | null;
  elapsed: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getNodeStatus(
  stage: StageName,
  stages: Map<StageName, StageEvent>,
  activeStage: StageName | null,
  pipelineIndex: number,
): NodeStatus {
  const event = stages.get(stage);
  if (event) return 'done';

  // Mark sequential nodes before the active one as done
  if (activeStage) {
    const activeIdx = PIPELINE.findIndex((n) => n.stage === activeStage);
    // For non-search nodes, anything before active is done
    if (!PIPELINE[pipelineIndex].isSearch && pipelineIndex < activeIdx) {
      return 'done';
    }
  }

  if (stage === activeStage) return 'active';
  return 'pending';
}

function getDetailText(event: StageEvent, isSearch: boolean): string | null {
  if (!event.detail) return null;
  if (isSearch && typeof event.detail.count === 'number') {
    return `${event.detail.count} results found`;
  }
  if (event.detail.text && event.detail.text.length <= 80) {
    return event.detail.text;
  }
  return null;
}

export default function ProgressView({ stages, activeStage, elapsed }: ProgressViewProps) {
  // Re-render every second for the timer
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">Analyzing your message</h1>
        <span className="font-mono text-sm tabular-nums text-slate-500">
          {formatElapsed(elapsed)}
        </span>
      </div>
      <p className="mb-8 text-sm text-slate-500">This usually takes 20–60 seconds.</p>

      {/* Desktop: horizontal pipeline */}
      <div className="hidden sm:block">
        <div className="flex items-start justify-between">
          {PIPELINE.map((node, i) => {
            const status = getNodeStatus(node.stage, stages, activeStage, i);
            const event = stages.get(node.stage);
            const detailText = event ? getDetailText(event, node.isSearch) : null;

            return (
              <div key={node.stage} className="flex flex-1 flex-col items-center">
                {/* Connector line (except before first) */}
                {i > 0 && (
                  <div className="absolute" style={{ left: 0, width: '100%', top: '20px', height: '2px', transform: 'translateX(-50%)' }}>
                    <div
                      className={`h-0.5 ${
                        status === 'done' ? 'bg-green-500' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                )}
                {/* Node circle */}
                <div className="relative z-10 mb-3">
                  {status === 'done' ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                      <Check className="h-5 w-5" />
                    </div>
                  ) : status === 'active' ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white shadow-md ring-4 ring-teal-100 animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                  )}
                </div>
                {/* Label */}
                <p
                  className={`text-center text-xs font-medium leading-tight ${
                    status === 'pending' ? 'text-slate-400' : 'text-slate-700'
                  }`}
                  style={{ maxWidth: '90px' }}
                >
                  {node.label}
                </p>
                {/* Detail text under active node */}
                {status === 'active' && detailText && (
                  <p className="mt-1 text-center text-[10px] leading-tight text-teal-600" style={{ maxWidth: '100px' }}>
                    {detailText}
                  </p>
                )}
                {/* Detail text under done search nodes */}
                {status === 'done' && detailText && node.isSearch && (
                  <p className="mt-1 text-center text-[10px] leading-tight text-green-600" style={{ maxWidth: '100px' }}>
                    {detailText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical pipeline */}
      <div className="sm:hidden">
        <div className="space-y-0">
          {PIPELINE.map((node, i) => {
            const status = getNodeStatus(node.stage, stages, activeStage, i);
            const event = stages.get(node.stage);
            const detailText = event ? getDetailText(event, node.isSearch) : null;

            return (
              <div key={node.stage} className="flex gap-3">
                {/* Left column: circle + connector */}
                <div className="flex flex-col items-center">
                  {status === 'done' ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                      <Check className="h-4 w-4" />
                    </div>
                  ) : status === 'active' ? (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white shadow-md ring-4 ring-teal-100 animate-pulse">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                  )}
                  {i < PIPELINE.length - 1 && (
                    <div className={`w-0.5 flex-1 ${status === 'done' ? 'bg-green-400' : 'bg-slate-200'}`} style={{ minHeight: '28px' }} />
                  )}
                </div>
                {/* Right column: label + detail */}
                <div className="pb-4">
                  <p
                    className={`text-sm font-medium ${
                      status === 'pending' ? 'text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {node.label}
                  </p>
                  {status === 'active' && detailText && (
                    <p className="mt-0.5 text-xs text-teal-600">{detailText}</p>
                  )}
                  {status === 'done' && detailText && node.isSearch && (
                    <p className="mt-0.5 text-xs text-green-600">{detailText}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
