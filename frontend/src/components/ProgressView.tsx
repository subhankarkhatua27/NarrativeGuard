import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { StageEvent, StageName } from '@/lib/types';

interface PipelineNode {
  stage: StageName;
  label: string;
  order: number;
  isSearch: boolean;
}

const PIPELINE: PipelineNode[] = [
  { stage: 'started', label: 'Reading the message', order: 1, isSearch: false },
  { stage: 'claim_analysis', label: 'Classifying the claim', order: 2, isSearch: false },
  { stage: 'factcheck_search', label: 'Searching fact-checks', order: 10, isSearch: true },
  { stage: 'archive_search', label: 'Searching our archive', order: 11, isSearch: true },
  { stage: 'news_search', label: 'Searching trusted news', order: 12, isSearch: true },
  { stage: 'evidence_built', label: 'Weighing evidence', order: 20, isSearch: false },
  { stage: 'evidence_check', label: 'Checking the evidence', order: 21, isSearch: false },
  { stage: 'verdict', label: 'Deciding the verdict', order: 30, isSearch: false },
];

type NodeStatus = 'pending' | 'active' | 'done';

interface ProgressViewProps {
  stages?: Map<StageName, StageEvent> | null;
  activeStage?: StageName | null;
  elapsed?: number;
}

function formatElapsed(seconds: number = 0): string {
  const safeSec = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getNodeStatus(
  node: PipelineNode,
  stagesMap: Map<StageName, StageEvent> | null | undefined,
  activeStage: StageName | null | undefined
): NodeStatus {
  if (!stagesMap) {
    if (node.stage === activeStage) return 'active';
    return 'pending';
  }

  const event = stagesMap.get(node.stage);
  if (event?.done) return 'done';

  // If a later stage order is active or recorded, mark earlier non-search nodes as done
  if (activeStage) {
    const activeNode = PIPELINE.find((n) => n.stage === activeStage);
    if (activeNode && node.order < activeNode.order) {
      return 'done';
    }
  }

  // Check if any stage with higher order exists in stagesMap
  for (const [stgKey, stgEvt] of stagesMap.entries()) {
    const stgNode = PIPELINE.find((n) => n.stage === stgKey);
    if (stgNode && stgNode.order > node.order && (stgEvt?.done || stgKey === activeStage)) {
      return 'done';
    }
  }

  if (node.stage === activeStage) return 'active';
  if (event) return 'active';

  return 'pending';
}

function getDetailText(event: StageEvent | undefined, isSearch: boolean): string | null {
  if (!event || !event.detail) return null;
  const count = event.detail.count;
  if (isSearch && typeof count === 'number') {
    return count === 1 ? '1 result found' : `${count} results found`;
  }
  if (event.detail.text && typeof event.detail.text === 'string' && event.detail.text.trim().length > 0) {
    const text = event.detail.text.trim();
    return text.length > 80 ? `${text.slice(0, 77)}...` : text;
  }
  return null;
}

export default function ProgressView({ stages, activeStage, elapsed = 0 }: ProgressViewProps) {
  // Re-render tick every second to keep live counter smooth
  const [, setTick] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Analyzing your message</h1>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-700">
            {formatElapsed(elapsed)}
          </span>
        </div>
      </div>
      <p className="mb-8 text-sm text-slate-500">This usually takes 20-60 seconds.</p>

      {/* Desktop View: Horizontal 8-stage pipeline */}
      <div className="hidden sm:block">
        <div className="relative flex items-start justify-between">
          {PIPELINE.map((node, i) => {
            const status = getNodeStatus(node, stages, activeStage);
            const event = stages?.get(node.stage);
            const detailText = getDetailText(event, node.isSearch);

            return (
              <div key={node.stage} className="relative flex flex-1 flex-col items-center text-center">
                {/* Connector line behind circles */}
                {i > 0 && (
                  <div
                    className="absolute top-5 -z-10 h-0.5"
                    style={{
                      left: '-50%',
                      width: '100%',
                    }}
                  >
                    <div
                      className={`h-full transition-colors duration-300 ${
                        status === 'done'
                          ? 'bg-emerald-500'
                          : status === 'active'
                          ? 'bg-teal-300'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>
                )}

                {/* Node Icon Circle */}
                <div className="relative z-10 mb-3">
                  {status === 'done' ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-50">
                      <Check className="h-5 w-5 stroke-[2.5]" />
                    </div>
                  ) : status === 'active' ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white shadow-md ring-4 ring-teal-100 animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                  )}
                </div>

                {/* Node Label */}
                <p
                  className={`px-1 text-xs font-medium leading-tight ${
                    status === 'pending'
                      ? 'text-slate-400'
                      : status === 'active'
                      ? 'font-semibold text-teal-900'
                      : 'text-slate-800'
                  }`}
                  style={{ maxWidth: '100px' }}
                >
                  {node.label}
                </p>

                {/* Detail text / search count badge under node */}
                {detailText && (
                  <div className="mt-1.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ${
                        status === 'done' && node.isSearch
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : status === 'active'
                          ? 'bg-teal-50 text-teal-700 border border-teal-200 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                      style={{ maxWidth: '110px' }}
                    >
                      {detailText}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile View: Vertical pipeline */}
      <div className="sm:hidden">
        <div className="space-y-0">
          {PIPELINE.map((node, i) => {
            const status = getNodeStatus(node, stages, activeStage);
            const event = stages?.get(node.stage);
            const detailText = getDetailText(event, node.isSearch);

            return (
              <div key={node.stage} className="flex gap-3">
                {/* Left timeline line & icon */}
                <div className="flex flex-col items-center">
                  <div className="relative z-10">
                    {status === 'done' ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-50">
                        <Check className="h-4 w-4 stroke-[2.5]" />
                      </div>
                    ) : status === 'active' ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white shadow-md ring-4 ring-teal-100 animate-pulse">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                      </div>
                    )}
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div
                      className={`w-0.5 flex-1 transition-colors duration-300 ${
                        status === 'done' ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                      style={{ minHeight: '32px' }}
                    />
                  )}
                </div>

                {/* Right node text content */}
                <div className="pb-5 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      status === 'pending'
                        ? 'text-slate-400'
                        : status === 'active'
                        ? 'font-semibold text-teal-900'
                        : 'text-slate-900'
                    }`}
                  >
                    {node.label}
                  </p>
                  {detailText && (
                    <p
                      className={`mt-0.5 text-xs ${
                        status === 'done' && node.isSearch
                          ? 'font-medium text-emerald-700'
                          : status === 'active'
                          ? 'font-medium text-teal-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {detailText}
                    </p>
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
