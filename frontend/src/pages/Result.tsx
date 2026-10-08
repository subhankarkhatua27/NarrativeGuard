import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getJob, openStream } from '@/lib/api';
import type {
  AnalysisResult,
  StageEvent,
  StageName,
  ErrorCode,
} from '@/lib/types';
import ProgressView from '@/components/ProgressView';
import ResultView from '@/components/ResultView';
import ErrorCard from '@/components/ErrorCard';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'progress' }
  | { kind: 'result'; result: AnalysisResult }
  | { kind: 'error'; message: string };

const NO_EVENT_TIMEOUT = 15_000;
const POLL_INTERVAL = 2_000;

export default function Result() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [stages, setStages] = useState<Map<StageName, StageEvent>>(new Map());
  const [activeStage, setActiveStage] = useState<StageName | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Refs for stream lifecycle and timers
  const disposeStreamRef = useRef<(() => void) | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noEventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const settledRef = useRef(false);

  // ---- /r/new: render from router state if available ----
  const routerState = location.state as { response?: { result?: AnalysisResult } } | null;
  const isNewRoute = id === 'new';

  // ---- Cleanup all timers and stream ----
  const cleanupAll = useCallback(() => {
    if (disposeStreamRef.current) {
      disposeStreamRef.current();
      disposeStreamRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (noEventTimerRef.current) {
      clearTimeout(noEventTimerRef.current);
      noEventTimerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ---- Start polling fallback ----
  const startPolling = useCallback(
    (jobId: string) => {
      // Close the stream — we're falling back
      if (disposeStreamRef.current) {
        disposeStreamRef.current();
        disposeStreamRef.current = null;
      }

      if (pollTimerRef.current) return; // already polling

      const poll = async () => {
        try {
          const res = await getJob(jobId);
          if (res.status === 'completed' && res.result) {
            if (!settledRef.current) {
              settledRef.current = true;
              cleanupAll();
              setView({ kind: 'result', result: res.result });
            }
          } else if (res.status === 'failed') {
            if (!settledRef.current) {
              settledRef.current = true;
              cleanupAll();
              setView({
                kind: 'error',
                message: res.error?.message || 'Analysis failed. Please try again.',
              });
            }
          }
        } catch {
          // keep polling on network errors
        }
      };

      poll(); // immediate first poll
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL);
    },
    [cleanupAll],
  );

  // ---- Open the SSE stream ----
  const startStream = useCallback(
    (jobId: string) => {
      lastEventTimeRef.current = Date.now();

      // Start no-event watchdog
      if (noEventTimerRef.current) clearTimeout(noEventTimerRef.current);
      noEventTimerRef.current = setTimeout(() => {
        const elapsedSinceEvent = Date.now() - lastEventTimeRef.current;
        if (elapsedSinceEvent >= NO_EVENT_TIMEOUT && !settledRef.current) {
          startPolling(jobId);
        }
      }, NO_EVENT_TIMEOUT);

      disposeStreamRef.current = openStream(
        jobId,
        // onStage
        (event: StageEvent) => {
          lastEventTimeRef.current = Date.now();

          // Reset the no-event watchdog
          if (noEventTimerRef.current) clearTimeout(noEventTimerRef.current);
          noEventTimerRef.current = setTimeout(() => {
            const elapsedSinceEvent = Date.now() - lastEventTimeRef.current;
            if (elapsedSinceEvent >= NO_EVENT_TIMEOUT && !settledRef.current) {
              startPolling(jobId);
            }
          }, NO_EVENT_TIMEOUT);

          setStages((prev) => {
            const next = new Map(prev);
            next.set(event.stage, event);
            return next;
          });
          setActiveStage(event.stage);
        },
        // onResult
        (result: AnalysisResult) => {
          if (!settledRef.current) {
            settledRef.current = true;
            cleanupAll();
            // Mark all stages as done
            setStages((prev) => {
              const next = new Map(prev);
              // Ensure all 8 stages are in the map
              const allStages: StageName[] = [
                'started', 'claim_analysis', 'factcheck_search',
                'archive_search', 'news_search', 'evidence_built',
                'evidence_check', 'verdict',
              ];
              for (const s of allStages) {
                if (!next.has(s)) {
                  next.set(s, {
                    event: 'stage',
                    stage: s,
                    index: 0,
                    total: 8,
                    done: true,
                  });
                }
              }
              return next;
            });
            setActiveStage(null);
            setView({ kind: 'result', result });
          }
        },
        // onFailed
        (error: { code: string; message: string }) => {
          if (!settledRef.current) {
            settledRef.current = true;
            cleanupAll();
            setView({ kind: 'error', message: error.message });
          }
        },
        // onError (stream connection error)
        (_err: Error) => {
          if (!settledRef.current) {
            startPolling(jobId);
          }
        },
      );
    },
    [cleanupAll, startPolling],
  );

  // ---- Start elapsed timer when entering progress view ----
  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) return;
    const startTime = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, []);

  // ---- Main effect: load job on mount / id change ----
  useEffect(() => {
    // Reset state for new job
    settledRef.current = false;
    setStages(new Map());
    setActiveStage(null);
    setElapsed(0);
    setView({ kind: 'loading' });

    // Handle /r/new with router state (seen_before case)
    if (isNewRoute) {
      const result = routerState?.response?.result;
      if (result) {
        setView({ kind: 'result', result });
        return;
      }
      // No result in state — show error since we can't re-fetch "new"
      setView({
        kind: 'error',
        message: 'This result is no longer available. Please check your message again.',
      });
      return;
    }

    if (!id) {
      setView({ kind: 'error', message: 'Invalid job ID.' });
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await getJob(id);
        if (cancelled) return;

        if (res.status === 'completed' && res.result) {
          setView({ kind: 'result', result: res.result });
        } else if (res.status === 'failed') {
          setView({
            kind: 'error',
            message: res.error?.message || 'Analysis failed. Please try again.',
          });
        } else {
          // queued or running → show progress + open stream
          setView({ kind: 'progress' });
          startElapsedTimer();
          startStream(id);
        }
      } catch {
        if (cancelled) return;
        setView({
          kind: 'error',
          message: 'Could not load this analysis. Please try again.',
        });
      }
    })();

    return () => {
      cancelled = true;
      cleanupAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => cleanupAll();
  }, [cleanupAll]);

  // ---- Render ----
  if (view.kind === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="animate-pulse text-sm text-slate-500">Loading analysis...</div>
      </div>
    );
  }

  if (view.kind === 'error') {
    return <ErrorCard message={view.message} />;
  }

  if (view.kind === 'progress') {
    return (
      <ProgressView stages={stages} activeStage={activeStage} elapsed={elapsed} />
    );
  }

  // result
  return <ResultView result={view.result} />;
}
