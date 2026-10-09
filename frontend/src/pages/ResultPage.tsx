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

function jobErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const rec = error as { message?: unknown };
    if (typeof rec.message === 'string' && rec.message.trim()) return rec.message;
  }
  return 'Analysis failed. Please try again.';
}

function readOriginalText(
  jobId: string | undefined,
  locationState: unknown,
): string | null {
  const state = locationState as { text?: unknown } | null;
  if (typeof state?.text === 'string' && state.text.trim()) {
    return state.text;
  }
  if (jobId && jobId !== 'new') {
    try {
      const stored = sessionStorage.getItem(`ng:msg:${jobId}`);
      if (stored && stored.trim()) return stored;
    } catch {
      return null;
    }
  }
  return null;
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [stages, setStages] = useState<Map<StageName, StageEvent>>(new Map());
  const [activeStage, setActiveStage] = useState<StageName | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const streamDisposerRef = useRef<(() => void) | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimeRef = useRef<number>(Date.now());
  const isSettledRef = useRef<boolean>(false);

  const routerState = location.state as { response?: { result?: AnalysisResult } } | null;
  const isNewRoute = id === 'new';
  const originalText = readOriginalText(id, location.state);

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

  const startPollingFallback = useCallback(
    (jobId: string) => {
      if (streamDisposerRef.current) {
        streamDisposerRef.current();
        streamDisposerRef.current = null;
      }

      if (pollingTimerRef.current) return;

      const pollJob = async () => {
        if (isSettledRef.current) return;
        try {
          const res = await getJob(jobId);
          if (isSettledRef.current) return;

          const isDone = res?.status === 'done';
          if (isDone && res?.result) {
            isSettledRef.current = true;
            stopAllServices();
            setView({ kind: 'result', result: res.result });
          } else if (res?.status === 'failed') {
            isSettledRef.current = true;
            stopAllServices();
            setView({
              kind: 'error',
              message: jobErrorMessage(res?.error),
            });
          }
        } catch {
          // Keep polling silently on transient network errors
        }
      };

      pollJob();
      pollingTimerRef.current = setInterval(pollJob, POLL_INTERVAL_MS);
    },
    [stopAllServices],
  );

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

  const startStreamConnection = useCallback(
    (jobId: string) => {
      lastEventTimeRef.current = Date.now();
      resetWatchdogTimer(jobId);

      streamDisposerRef.current = openStream(
        jobId,
        (event: StageEvent) => {
          if (isSettledRef.current) return;
          lastEventTimeRef.current = Date.now();
          resetWatchdogTimer(jobId);

          if (event && event.stage) {
            setStages((prev) => {
              const next = new Map(prev);
              next.set(event.stage as StageName, event);
              return next;
            });
            setActiveStage(event.stage as StageName);
          }
        },
        (result: AnalysisResult) => {
          if (!isSettledRef.current) {
            isSettledRef.current = true;
            stopAllServices();
            setView({ kind: 'result', result });
          }
        },
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
        (_err: Error) => {
          if (!isSettledRef.current) {
            startPollingFallback(jobId);
          }
        },
      );
    },
    [resetWatchdogTimer, stopAllServices, startPollingFallback],
  );

  const startElapsedTimer = useCallback(() => {
    if (elapsedTimerRef.current) return;
    const startTime = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, []);

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

        const isDone = res?.status === 'done';
        if (isDone && res?.result) {
          isSettledRef.current = true;
          setView({ kind: 'result', result: res.result });
        } else if (res?.status === 'failed') {
          isSettledRef.current = true;
          setView({
            kind: 'error',
            message: jobErrorMessage(res?.error),
          });
        } else {
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

  useEffect(() => {
    return () => {
      stopAllServices();
    };
  }, [stopAllServices]);

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

  return <ResultView result={view.result} originalText={originalText} />;
}
