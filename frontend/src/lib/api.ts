import type {
  CheckClaimRequest,
  CheckClaimResponse,
  GetJobResponse,
  ExampleItem,
  StageEvent,
  AnalysisResult,
} from './types';
import {
  MOCK_EXAMPLES,
  mockCheckClaim,
  mockGetJob,
  mockOpenStream,
} from './mock';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function apiError(code: string, message: string): Error & { code: string } {
  const e = new Error(message) as Error & { code: string };
  e.code = code;
  return e;
}

async function throwFromResponse(res: Response): Promise<never> {
  const errBody = await res.json().catch(() => ({}));
  const detail = (errBody as { detail?: { code?: string; message?: string } })?.detail;
  const code = typeof detail?.code === 'string' ? detail.code : 'unknown';
  const message =
    typeof detail?.message === 'string' && detail.message.trim()
      ? detail.message
      : 'Request failed';
  throw apiError(code, message);
}

function failedPayload(data: unknown): { code: string; message: string } {
  const error = (data as { error?: unknown })?.error;
  if (typeof error === 'string') {
    return { code: 'unknown', message: error };
  }
  if (error && typeof error === 'object') {
    const rec = error as { code?: unknown; message?: unknown };
    return {
      code: typeof rec.code === 'string' ? rec.code : 'unknown',
      message: typeof rec.message === 'string' ? rec.message : 'Analysis failed',
    };
  }
  return { code: 'unknown', message: 'Analysis failed' };
}

export async function checkClaim(body: CheckClaimRequest): Promise<CheckClaimResponse> {
  if (USE_MOCK) {
    await delay(600 + Math.random() * 400);
    try {
      return mockCheckClaim(body.text, { force: body.force });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || 'unknown';
      const message = (err as { message?: string })?.message || 'Unknown error';
      throw apiError(code, message);
    }
  }

  const res = await fetch(`${BASE_URL}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await throwFromResponse(res);
  }

  return res.json() as Promise<CheckClaimResponse>;
}

export async function getJob(id: string): Promise<GetJobResponse> {
  if (USE_MOCK) {
    await delay(300);
    return mockGetJob(id);
  }

  const res = await fetch(`${BASE_URL}/api/jobs/${encodeURIComponent(id)}`);
  if (!res.ok) {
    await throwFromResponse(res);
  }
  return res.json() as Promise<GetJobResponse>;
}

export async function getExamples(): Promise<ExampleItem[]> {
  if (USE_MOCK) {
    await delay(200);
    return MOCK_EXAMPLES;
  }

  const res = await fetch(`${BASE_URL}/api/examples`);
  if (!res.ok) {
    return [];
  }
  return res.json() as Promise<ExampleItem[]>;
}

export function openStream(
  id: string,
  onStage: (event: StageEvent) => void,
  onResult: (result: AnalysisResult) => void,
  onFailed: (error: { code: string; message: string }) => void,
  onError: (err: Error) => void,
): () => void {
  if (USE_MOCK) {
    const controller = new AbortController();
    mockOpenStream(id, onStage, onResult, onFailed, controller.signal);
    return () => controller.abort();
  }

  const url = `${BASE_URL}/api/jobs/${encodeURIComponent(id)}/stream`;
  const es = new EventSource(url);
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    es.close();
  };

  es.addEventListener('stage', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as StageEvent;
      onStage(data);
    } catch {
      // ignore malformed
    }
  });

  es.addEventListener('result', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as AnalysisResult;
      close();
      onResult(data);
    } catch {
      // ignore malformed
    }
  });

  es.addEventListener('failed', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      close();
      onFailed(failedPayload(data));
    } catch {
      close();
      onFailed({ code: 'unknown', message: 'Analysis failed' });
    }
  });

  es.onerror = () => {
    close();
    onError(new Error('Stream connection failed'));
  };

  return close;
}

export function preWarm(): void {
  if (USE_MOCK) return;
  fetch(`${BASE_URL}/health`, { method: 'GET' }).catch(() => {});
}
