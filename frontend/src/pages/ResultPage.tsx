import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getJob, openStream } from '@/lib/api';
import type {
  AnalysisResult,
  StageEvent,
  StageName,
} from '@/lib/types';
import ProgressView from '@/components/ProgressView';
import ResultView from '@/components/ResultView';
import ErrorCard from '@/components/ErrorCard';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'progress' }
  | { kind: 'result'; result: AnalysisResult }
  | { kind: 'error'; message: string };

const NO_EVENT_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 2_000;

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [stages, setStages] = useState<Map<StageName, StageEvent>>(new Map());
  const [activeStage, setActiveStage] = useState<StageName | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Refs for stream lifecycle and timers
  const streamDisposerRef = useRef<(() => void) | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const isSettledRef = useRef<boolean>(false);

  // Router state check for /r/new or cached result
  const routerState = location.state as { response?: { result?: AnalysisResult } } | null;
  const isNewRoute = id === 'new';

  // ---- Cleanup all active streams and timers ----
  const stopAllServices = useCallback(() => {
    if (streamDisposerRef.current) {
      streamDisposerRef.current();
      streamDisposerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // ---- Polling fallback (runs if SSE fails or times out) ----
  const startPollingFallback = useCallback(
    (jobId: string) => {
      // Disconnect SSE stream if open
      if (streamDisposerRef.current) {
        streamDisposerRef.current();
        streamDisposerRef.current = null;
      }

      if (pollingTimerRef.current) return; // already polling

      const pollJob = async () => {
        if (isSettledRef.current) return;
        try {
          const res = await getJob(jobId);
          if (isSettledRef.current) return;

          const isDone = res?.status === 'completed';
          if (isDone && res?.result) {
            isSettledRef.current = true;
            stopAllServices();
            setView({ kind: 'result', result: res.result });
          } else if (res?.status === 'failed') {
            isSettledRef.current = true;
            stopAllServices();
            setView({
              kind: 'error',
              message: res?.error?.message || 'Analysis failed. Please try again.',
            });
          }
        } catch {
          // Keep polling silently on transient network errors
        }
      };

      // Poll immediately and start interval
      pollJob();
      pollingTimerRef.current = setInterval(pollJob, POLL_INTERVAL_MS);
    },
    [stopAllServices],
  );

  // ---- Watchdog timer: fallback to polling if 15s pass without an event ----
  const resetWatchdogTimer = useCallback(
    (jobId: string) => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
      watchdogTimerRef.current = setTimeout(() => {
        const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
        if (timeSinceLastEvent >= NO_EVENT_TIMEOUT_MS && !isSettledRef.current) {
          startPollingFallback(jobId);
        }
      }, NO_EVENT_TIMEOUT_MS);
    },
    [startPollingFallback],
  );

  // ---- Open SSE Stream connection ----
  const startStreamConnection = useCallback(
    (jobId: string) => {
      lastEventTimeRef.current = Date.now();
      resetWatchdogTimer(jobId);

      streamDisposerRef.current = openStream(
        jobId,
        // onStage
        (event: StageEvent) => {
          if (isSettledRef.current) return;
          lastEventTimeRef.current = Date.now();
          resetWatchdogTimer(jobId);

          if (event && event.stage) {
            setStages((prev) => {
              const next = new Map(prev);
              next.set(event.stage, event);
              return next;
            });
            setActiveStage(event.stage);
          }
        },
        // onResult: ALWAYS close stream & render result
        (result: AnalysisResult) => {
          if (!isSettledRef.current) {
            isSettledRef.current = true;
            stopAllServices();
            setView({ kind: 'result', result });
          }
        },
        // onFailed: ALWAYS close stream & show error
        (error: { code: string; message: string }) => {
          if (!isSettledRef.current) {
            isSettledRef.current = true;
            stopAllServices();
            setView({
              kind: 'error',
              message: error?.message || 'Analysis failed. Please try again.',
            });
          }
        },
        // onError: Stream error fallback to polling
        (_err: Error) => {
          if (!isSettledRef.current) {
            startPollingFallback(jobId);
          }
        },
      );
    },
    [resetWatchdogTimer, stopAllServices, startPollingFallback],
  );

  // ---- Elapsed timer ----
  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) return;
    const startTime = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, []);

  // ---- Initialization Effect ----
  useEffect(() => {
    isSettledRef.current = false;
    setStages(new Map());
    setActiveStage(null);
    setElapsed(0);
    setView({ kind: 'loading' });

    if (isNewRoute) {
      const cachedResult = routerState?.response?.result;
      if (cachedResult) {
        setView({ kind: 'result', result: cachedResult });
        return;
      }
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

    let isCancelled = false;

    (async () => {
      try {
        const res = await getJob(id);
        if (isCancelled) return;

        const isDone = res?.status === 'completed';
        if (isDone && res?.result) {
          isSettledRef.current = true;
          setView({ kind: 'result', result: res.result });
        } else if (res?.status === 'failed') {
          isSettledRef.current = true;
          setView({
            kind: 'error',
            message: res?.error?.message || 'Analysis failed. Please try again.',
          });
        } else {
          // queued or running -> show progress and start stream
          setView({ kind: 'progress' });
          startElapsedTimer();
          startStreamConnection(id);
        }
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = (err as { message?: string })?.message || 'Could not load this analysis. Please try again.';
        setView({
          kind: 'error',
          message: msg,
        });
      }
    })();

    return () => {
      isCancelled = true;
      stopAllServices();
    };
  }, [id, isNewRoute, routerState, startElapsedTimer, startStreamConnection, stopAllServices]);

  // Lifecycle cleanup
  useEffect(() => {
    return () => {
      stopAllServices();
    };
  }, [stopAllServices]);

  // ---- Views ----
  if (view.kind === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <div className="animate-pulse text-sm font-medium text-slate-500">
          Loading analysis...
        </div>
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

  return <ResultView result={view.result} />;
}
