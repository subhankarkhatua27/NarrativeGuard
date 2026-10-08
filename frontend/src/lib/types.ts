// ---- API contract types for NarrativeGuard ----

export type Verdict = 'misleading' | 'contradicted' | 'unverifiable' | 'too_new';

export type SourceTier = 'T1' | 'T2' | 'T3';

export type SourceRelation = 'supports' | 'contradicts' | 'context' | 'neutral';

export interface DiffSpan {
  start: number;
  end: number;
  type: 'twist' | 'fabrication' | 'omission' | 'exaggeration';
  note: string;
}

export interface RedFlag {
  type: string;
  text: string;
}

export interface Source {
  url: string;
  title: string;
  publisher: string;
  date: string;
  tier: SourceTier;
  relation: SourceRelation;
  snippet: string;
}

export interface VerifiedFact {
  summary: string;
  details: string;
}

export interface SeenBefore {
  found: boolean;
  job_id: string | null;
  claim_hash: string;
}

// ---- Streaming / progress types ----

export type StageName =
  | 'started'
  | 'claim_analysis'
  | 'factcheck_search'
  | 'archive_search'
  | 'news_search'
  | 'evidence_built'
  | 'evidence_check'
  | 'verdict';

export interface StageEventDetail {
  text?: string;
  count?: number;
}

export interface StageEvent {
  event: 'stage';
  stage: StageName;
  label?: string;
  detail?: StageEventDetail;
  index: number;
  total: number;
  done: boolean;
}

export interface ResultEvent {
  event: 'result';
  result: AnalysisResult;
}

export interface FailedEvent {
  event: 'failed';
  error: { code: ErrorCode; message: string };
}

export type StreamEvent = StageEvent | ResultEvent | FailedEvent;

export interface AnalysisResult {
  verdict: Verdict;
  confidence: number;
  basis: string;
  claim_text: string;
  cleaned_text: string;
  verified_fact: VerifiedFact;
  red_flags: RedFlag[];
  diff_spans: DiffSpan[];
  sources: Source[];
  seen_before: SeenBefore;
  created_at: string;
}

export type ErrorCode =
  | 'invalid_input'
  | 'captcha_missing'
  | 'captcha_failed'
  | 'ip_hour'
  | 'ip_day'
  | 'global_day'
  | 'n8n_offline';

export interface CheckClaimRequest {
  text: string;
  captcha_token?: string;
}

export interface CheckClaimResponse {
  job_id: string | null;
  from_cache: boolean;
  seen_before: SeenBefore;
  result?: AnalysisResult;
}

export interface GetJobResponse {
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: AnalysisResult;
  error?: { code: ErrorCode; message: string };
}

export interface ExampleItem {
  id: string;
  title: string;
  verdict: Verdict;
  snippet: string;
  claim_text: string;
  result: AnalysisResult;
}
