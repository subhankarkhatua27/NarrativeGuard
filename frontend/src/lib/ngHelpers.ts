import type { AnalysisResult, Source, VerdictKey } from './types';

export const VERDICT_META: Record<VerdictKey, { label: string; chip: string; hex: string }> = {
  contradicted: { label: 'Contradicted', chip: 'bg-red-100 text-red-800', hex: '#b91c1c' },
  misleading: { label: 'Misleading', chip: 'bg-amber-100 text-amber-800', hex: '#b45309' },
  disputed: { label: 'Disputed', chip: 'bg-purple-100 text-purple-800', hex: '#7e22ce' },
  too_new: { label: 'Too new to verify', chip: 'bg-blue-100 text-blue-800', hex: '#1d4ed8' },
  unverifiable: { label: 'Unverifiable', chip: 'bg-slate-200 text-slate-700', hex: '#475569' },
  supported: { label: 'Supported', chip: 'bg-green-100 text-green-800', hex: '#15803d' },
  not_checkable: { label: 'Not checkable', chip: 'bg-gray-200 text-gray-700', hex: '#4b5563' },
};

export const TIER_LABEL: Record<number, string> = {
  1: 'Official',
  2: 'Fact-checker',
  3: 'Trusted news',
  4: 'Signal only',
};

const BY_LABEL: Record<string, VerdictKey> = {
  'too new to verify': 'too_new',
  'too new': 'too_new',
  'not checkable': 'not_checkable',
};

export function keyOf(r?: AnalysisResult | null): VerdictKey {
  const k = r?.verdict_key;
  if (typeof k === 'string' && k in VERDICT_META) return k as VerdictKey;
  const l = String(r?.verdict ?? '').toLowerCase().trim();
  if (l in VERDICT_META) return l as VerdictKey;
  return BY_LABEL[l] ?? 'unverifiable';
}

export function safeUrl(u?: string | null): string | null {
  try {
    const x = new URL(u ?? '');
    return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : null;
  } catch {
    return null;
  }
}

export function fmtDate(d?: string | null): string {
  if (!d) return '';
  const t = new Date(d);
  return Number.isNaN(t.getTime())
    ? ''
    : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function cut(s: string | null | undefined, n: number): string {
  const t = (s ?? '').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

export function topSource(r?: AnalysisResult | null): Source | null {
  const list = (r?.sources ?? []).filter((s) => s.relation !== 'unrelated' && safeUrl(s.url));
  list.sort((a, b) => (a.tier ?? 9) - (b.tier ?? 9));
  return list[0] ?? null;
}

export const REPORT_URL = 'https://github.com/subhankarkhatua27/NarrativeGuard/issues/new';
