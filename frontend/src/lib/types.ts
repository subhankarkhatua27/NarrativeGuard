// ---- API contract types for NarrativeGuard ----

export type Verdict =
  | 'misleading'
  | 'contradicted'
  | 'unverifiable'
  | 'too_new'
  | 'supported'
  | 'disputed'
  | 'not_checkable'
  | string;

export type VerdictKey =
  | 'contradicted'
  | 'supported'
  | 'misleading'
  | 'disputed'
  | 'too_new'
  | 'unverifiable'
  | 'not_checkable';

export type AdvicePill =
  | "Don't forward"
  | 'Wait'
  | 'Safe to share with source'
  | 'Share as opinion, not as fact'
  | string;

export type MutationType =
  | 'fabrication'
  | 'reframing'
  | 'exaggeration'
  | 'omission'
  | 'old_news'
  | 'false_context'
  | string;

export type SourceTier = 'T1' | 'T2' | 'T3' | 'T4' | 1 | 2 | 3 | 4;

export type SourceRelation =
  | 'supports'
  | 'contradicts'
  | 'background'
  | 'context'
  | 'unrelated'
  | 'neutral';

export interface DiffSpan {
  start?: number;
  end?: number;
  type?: string;
  span?: string;
  note: string;
}

export interface RedFlag {
  type?: string;
  tactic?: string;
  text?: string;
  span?: string;
}

export interface Source {
  id?: string;
  kind?: 'factcheck' | 'archive' | 'news' | string;
  url: string;
  title: string;
  publisher: string;
  domain?: string;
  date: string;
  tier: SourceTier;
  relation: SourceRelation;
  snippet: string;
  rating?: string;
  syndicated_by?: string[];
  fc_match?: boolean;
}

export interface VerifiedFact {
  text?: string;
  summary?: string;
  details?: string;
  evidence_ids?: string[];
}

export interface SeenBefore {
  found: boolean;
  job_id: string | null;
  claim_hash?: string;
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
  verdict_key?: VerdictKey;
  confidence?: number;
  basis: string;
  as_of?: string;
  what_would_change?: string;
  advice?: AdvicePill;
  claim?: string;
  claim_text?: string;
  cleaned_text?: string;
  claim_type?: 'fact' | 'breaking_event' | 'recycled' | 'opinion' | string;
  verified_fact?: VerifiedFact | null;
  red_flags?: RedFlag[];
  mutations?: MutationType[];
  diff_spans?: DiffSpan[];
  old_news?: 'possibly_old' | 'recent' | 'cant_tell' | string;
  earliest_date?: string | null;
  sources?: Source[];
  seen_before?: SeenBefore;
  created_at?: string;
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
