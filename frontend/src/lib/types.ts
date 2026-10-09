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

export type SourceKind = 'factcheck' | 'archive' | 'news' | string;

export type SourceRelation = 'supports' | 'contradicts' | 'unrelated' | 'background' | string;

export interface DiffSpan {
  span?: string;
  note?: string;
}

export interface RedFlag {
  tactic?: string;
  span?: string;
}

export interface Source {
  id?: string;
  kind?: SourceKind;
  publisher?: string;
  domain?: string;
  tier?: number;
  title?: string;
  url?: string;
  date?: string;
  rating?: string;
  relation?: SourceRelation;
  snippet?: string;
  syndicated_by?: string[];
  fc_match?: boolean;
}

export interface VerifiedFact {
  text?: string;
  evidence_ids?: string[];
}

export interface SeenBeforeVerdict {
  claim?: string;
  result?: unknown;
  similarity?: number;
}

export interface SeenBeforeArchiveItem {
  title?: string;
  url?: string;
  source?: string;
  domain?: string;
  tier?: number;
  published_at?: string;
  similarity?: number;
}

export interface SeenBefore {
  found?: boolean;
  verdicts?: SeenBeforeVerdict[];
  archive?: SeenBeforeArchiveItem[];
}

export type StageName =
  | 'started'
  | 'claim_analysis'
  | 'factcheck_search'
  | 'archive_search'
  | 'news_search'
  | 'evidence_built'
  | 'evidence_check'
  | 'verdict'
  | string;

export interface StageEventDetail {
  count?: number;
}

export interface StageEvent {
  seq?: number;
  stage?: StageName;
  status?: string;
  detail?: StageEventDetail | null;
}

export interface AnalysisResult {
  verdict?: string;
  verdict_key?: VerdictKey | string;
  basis?: string;
  as_of?: string;
  what_would_change?: string;
  advice?: AdvicePill;
  claim?: string;
  claim_type?: string;
  red_flags?: RedFlag[];
  mutations?: MutationType[];
  diff_spans?: DiffSpan[];
  verified_fact?: VerifiedFact | null;
  old_news?: 'possibly_old' | 'recent' | 'cant_tell' | string;
  earliest_date?: string | null;
  sources?: Source[];
}

export type ErrorCode =
  | 'invalid_input'
  | 'captcha_missing'
  | 'captcha_failed'
  | 'captcha_unavailable'
  | 'ip_hour'
  | 'ip_day'
  | 'global_day'
  | 'n8n_offline';

export interface CheckClaimRequest {
  text: string;
  lang?: string;
  force?: boolean;
  turnstile_token?: string;
}

export interface CheckClaimResponse {
  job_id: string | null;
  from_cache?: boolean;
  result?: AnalysisResult | null;
  redactions?: unknown;
  seen_before?: SeenBefore | null;
}

export interface JobEvent {
  seq?: number;
  stage?: StageName;
  status?: string;
  detail?: StageEventDetail | null;
}

export interface GetJobResponse {
  job_id?: string;
  status?: 'queued' | 'running' | 'done' | 'failed' | string;
  result?: AnalysisResult | null;
  error?: unknown;
  events?: JobEvent[];
}

export interface ExampleItem {
  id: string;
  claim?: string;
  lang?: string;
  expected_verdict?: string;
  featured?: boolean;
  result?: AnalysisResult | null;
}
