import { useRef, useState } from 'react';
import { Check, Copy, Download, Flag, MessageCircle, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { AnalysisResult, VerdictKey } from '@/lib/types';
import { REPORT_URL, VERDICT_META, cut, fmtDate, keyOf, safeUrl, topSource } from '@/lib/ngHelpers';

function buildReply(r: AnalysisResult): string {
  const k = keyOf(r);
  const say: Record<VerdictKey, string> = {
    contradicted: 'I checked it, and trusted sources say this is not accurate.',
    misleading: 'I checked it. Parts of it are real, but it is presented in a misleading way.',
    disputed: 'I checked it, and credible sources disagree, so it is not settled.',
    too_new: 'I checked it, but it is too new to confirm yet. Reports are still early.',
    unverifiable: 'I checked it, but I could not find enough reliable evidence either way.',
    supported: 'I checked it, and reliable sources back this up.',
    not_checkable: 'It reads like an opinion or a prediction, so there is no fact to check.',
  };
  const parts = ['Hi, thanks for sending this.', say[k]];
  const fact = r.verified_fact?.text?.trim();
  if (fact) parts.push(`What we could verify: ${fact}`);
  const top = topSource(r);
  if (top?.url) parts.push(`Source: ${top.publisher || top.domain || 'link'} - ${top.url}`);
  parts.push(
    k === 'supported'
      ? 'Fine to share if you include the source.'
      : k === 'not_checkable'
        ? 'Best shared as an opinion, not as a fact.'
        : "Let's not forward it until it is confirmed.",
  );
  return parts.join('\n\n');
}

export default function ShareTools({ result }: { result: AnalysisResult }) {
  const key = keyOf(result);
  const meta = VERDICT_META[key];
  const [reply, setReply] = useState(() => buildReply(result));
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const top = topSource(result);
  const fact = result.verified_fact?.text?.trim() ?? '';
  const claim = (result.claim ?? '').trim();

  async function copy() {
    setErr('');
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr('Copy failed. Select the text and copy it manually.');
    }
  }

  async function makeCard() {
    if (!cardRef.current) return;
    setBusy(true);
    setErr('');
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 1, cacheBust: true, skipFonts: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'narrativeguard-check.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'NarrativeGuard check' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'narrativeguard-check.png';
        a.click();
      }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setErr('Could not create the card. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const btn =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Reply to the person who sent this</h2>
      <p className="mt-1 text-xs text-slate-500">
        A ready-made reply based on this result. Edit it before you send.
      </p>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={8}
        className="mt-3 block w-full rounded-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
        style={{ fontFamily: "Inter, 'Noto Sans Bengali', system-ui, sans-serif" }}
        aria-label="Reply text"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={`${btn} bg-slate-900 text-white hover:bg-slate-700`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(reply)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} bg-green-600 text-white hover:bg-green-700`}
        >
          <MessageCircle className="h-4 w-4" />
          Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={makeCard}
          disabled={busy}
          className={`${btn} border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-60`}
        >
          {typeof navigator !== 'undefined' && 'canShare' in navigator ? (
            <Share2 className="h-4 w-4" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {busy ? 'Creating...' : 'Create share card'}
        </button>
      </div>
      {err && <p className="mt-2 text-sm font-medium text-red-600">{err}</p>}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Flag className="h-3.5 w-3.5" />
        Think this verdict is wrong?{' '}
        <a href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 underline">
          Report it
        </a>
      </p>

      {/* Hidden share card, rendered off-screen and captured as a PNG */}
      <div style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div
          ref={cardRef}
          style={{
            width: 1080,
            height: 1350,
            boxSizing: 'border-box',
            padding: 80,
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            color: '#0f172a',
            fontFamily: "Inter, 'Noto Sans Bengali', system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 700, color: '#0d9488' }}>NarrativeGuard</div>
          <div
            style={{
              alignSelf: 'flex-start',
              marginTop: 56,
              padding: '16px 36px',
              borderRadius: 999,
              background: meta.hex,
              color: '#ffffff',
              fontSize: 48,
              fontWeight: 700,
            }}
          >
            {meta.label}
          </div>
          {claim && (
            <>
              <div style={{ marginTop: 56, fontSize: 26, letterSpacing: 2, color: '#64748b' }}>THE MESSAGE SAID</div>
              <div style={{ marginTop: 12, fontSize: 44, lineHeight: 1.3, fontWeight: 600 }}>{cut(claim, 140)}</div>
            </>
          )}
          {fact && (
            <>
              <div style={{ marginTop: 56, fontSize: 26, letterSpacing: 2, color: '#64748b' }}>WHAT IS VERIFIED</div>
              <div style={{ marginTop: 12, fontSize: 40, lineHeight: 1.35 }}>{cut(fact, 200)}</div>
            </>
          )}
          <div style={{ marginTop: 'auto', fontSize: 28, color: '#475569', lineHeight: 1.4 }}>
            {top ? `Source: ${top.publisher || top.domain || ''} - ${cut(safeUrl(top.url) ?? '', 70)}` : ''}
          </div>
          <div style={{ marginTop: 20, fontSize: 24, color: '#94a3b8' }}>
            Checked {fmtDate(result.as_of)} - Check before you forward
          </div>
        </div>
      </div>
    </section>
  );
}
