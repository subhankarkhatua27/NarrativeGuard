import type {
  CheckClaimRequest,
  CheckClaimResponse,
  GetJobResponse,
  ExampleItem,
  StageEvent,
  AnalysisResult,
  StreamEvent,
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

function mockError(code: string, message: string): Error & { code: string } {
  const e = new Error(message) as Error & { code: string };
  e.code = code;
  return e;
}

// ---- checkClaim ----
export async function checkClaim(body: CheckClaimRequest): Promise<CheckClaimResponse> {
  if (USE_MOCK) {
    await delay(600 + Math.random() * 400);
    try {
      const res = mockCheckClaim(body.text);
      return res;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || 'n8n_offline';
      const message = (err as { message?: string })?.message || 'Unknown error';
      throw mockError(code, message);
    }
  }

  const res = await fetch(`${BASE_URL}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const code = errBody.error?.code || errBody.code || 'invalid_input';
    const message = errBody.error?.message || errBody.message || 'Request failed';
    throw mockError(code, message);
  }

  return res.json() as Promise<CheckClaimResponse>;
}

// ---- getJob ----
export async function getJob(id: string): Promise<GetJobResponse> {
  if (USE_MOCK) {
    await delay(300);
    return mockGetJob(id);
  }

  const res = await fetch(`${BASE_URL}/api/job/${encodeURIComponent(id)}`);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const code = errBody.error?.code || 'invalid_input';
    const message = errBody.error?.message || 'Failed to fetch job';
    throw mockError(code, message);
  }
  return res.json() as Promise<GetJobResponse>;
}

// ---- getExamples ----
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

// ---- openStream: returns a disposer function ----
// Calls onStage for stage events, onResult for result events, onFailed for failed events.
export function openStream(
  id: string,
  onStage: (event: StageEvent) => void,
  onResult: (result: AnalysisResult) => void,
  onFailed: (error: { code: string; message: string }) => void,
  onError: (err: Error) => void,
): () => void {
  if (USE_MOCK) {
    const controller = new AbortController();
    mockOpenStream(
      id,
      onStage,
      onResult,
      controller.signal,
    );
    return () => controller.abort();
  }

  const url = `${BASE_URL}/api/job/${encodeURIComponent(id)}/stream`;
  const es = new EventSource(url);

  es.onmessage = (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data) as StreamEvent;
      if (data.event === 'stage') {
        onStage(data);
      } else if (data.event === 'result') {
        onResult(data.result);
      } else if (data.event === 'failed') {
        onFailed(data.error);
      }
    } catch {
      // ignore malformed
    }
  };

  es.onerror = () => {
    onError(new Error('Stream connection failed'));
    es.close();
  };

  return () => es.close();
}

// ---- preWarm: silent GET to /health ----
export function preWarm(): void {
  if (USE_MOCK) return;
  fetch(`${BASE_URL}/health`, { method: 'GET' }).catch(() => {});
}
