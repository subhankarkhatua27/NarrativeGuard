import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { ShieldCheck, Loader2, Send, Lock } from 'lucide-react';
import { checkClaim, getExamples, preWarm } from '@/lib/api';
import type { ExampleItem, ErrorCode } from '@/lib/types';
import OfflineBanner from '@/components/OfflineBanner';

const MAX_CHARS = 2000;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid_input: 'Message is too short or too long.',
  captcha_missing: 'Please complete the verification.',
  captcha_failed: 'Verification failed, try again.',
  ip_hour: 'You have reached the check limit for now. Try again later or browse examples.',
  ip_day: 'You have reached the check limit for now. Try again later or browse examples.',
  global_day:
    "We have reached today's free analysis limit. Try the examples, or come back tomorrow.",
  n8n_offline: '',
};

export default function Home() {
  const navigate = useNavigate();

  const [text, setText] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOffline, setShowOffline] = useState(false);
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [examples, setExamples] = useState<ExampleItem[]>([]);

  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-warm backend on mount + load examples
  useEffect(() => {
    preWarm();
    getExamples()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, []);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      setErrorMsg(null);
      setShowOffline(false);
      setShowSlowNotice(false);
      setLoading(true);

      // Start 4-second timer for slow-notice
      slowTimerRef.current = setTimeout(() => {
        setShowSlowNotice(true);
      }, 4000);

      try {
        const res = await checkClaim({
          text: text.trim(),
          captcha_token: captchaToken ?? undefined,
        });

        // Clear slow timer
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }

        // Case 1: from_cache with job_id → navigate to /r/:id
        if (res.job_id && res.from_cache) {
          navigate(`/r/${res.job_id}`);
          return;
        }

        // Case 2: seen_before.found and job_id null → navigate to /r/new with state
        if (res.seen_before.found && res.job_id === null) {
          navigate('/r/new', { state: { response: res } });
          return;
        }

        // Case 3: new job_id → navigate to /r/:id
        if (res.job_id) {
          navigate(`/r/${res.job_id}`);
          return;
        }

        // Fallback: shouldn't happen, but navigate to /r/new
        navigate('/r/new', { state: { response: res } });
      } catch (err: unknown) {
        if (slowTimerRef.current) {
          clearTimeout(slowTimerRef.current);
          slowTimerRef.current = null;
        }
        const code = (err as { code?: string })?.code as ErrorCode | undefined;
        if (code === 'n8n_offline') {
          setShowOffline(true);
        } else if (code && ERROR_MESSAGES[code]) {
          setErrorMsg(ERROR_MESSAGES[code]);
        } else {
          setErrorMsg('Something went wrong. Please try again.');
        }
        setLoading(false);
        resetCaptcha();
      }
    },
    [captchaToken, loading, navigate, resetCaptcha, text],
  );

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = text.trim().length > 0 && !isOverLimit && !loading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {showOffline && (
        <div className="mb-6">
          <OfflineBanner />
        </div>
      )}

      {/* Hero */}
      <div className="mb-8 text-center sm:mb-10">
        <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-teal-50 p-3">
          <ShieldCheck className="h-8 w-8 text-teal-600" />
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          Got a forwarded message? Check it before you share it.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Paste it here. We show what fact-checkers and trusted news say, how it was
          twisted, and what is actually true.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_CHARS}
            rows={6}
            placeholder="Paste the WhatsApp or social media message here..."
            className="block w-full resize-y border-0 px-4 py-4 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:text-base"
            aria-label="Message to check"
          />
          <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-4 py-2">
            <span
              className={`text-xs font-medium tabular-nums ${
                isOverLimit ? 'text-red-600' : 'text-slate-400'
              }`}
            >
              {charCount} / {MAX_CHARS}
            </span>
          </div>
        </div>

        {/* Turnstile widget — only if site key is present */}
        {TURNSTILE_SITE_KEY && (
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              options={{ theme: 'light', size: 'flexible' }}
            />
          </div>
        )}

        {/* Submit button */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Check this message
              </>
            )}
          </button>

          {/* Slow notice */}
          {showSlowNotice && loading && (
            <p className="text-center text-xs text-slate-500">
              Waking up the server (free hosting can take up to a minute)...
            </p>
          )}

          {/* Error message */}
          {errorMsg && (
            <p className="text-center text-sm font-medium text-red-600">{errorMsg}</p>
          )}
        </div>
      </form>

      {/* Privacy note */}
      <div className="mt-6 flex items-start gap-2 rounded-lg bg-slate-100 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-xs leading-relaxed text-slate-500">
          Phone numbers and emails are removed before analysis. Free-tier AI prompts may
          be used by Google to improve its models.
        </p>
      </div>

      {/* Example chips */}
      {examples.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Try UI Test Inputs & Examples
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {examples.length} test scenarios available
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {examples.map((ex) => (
              <button
                key={ex.id}
                onClick={() => navigate(`/e/${ex.id}`)}
                className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      ex.verdict === 'contradicted'
                        ? 'bg-red-500'
                        : ex.verdict === 'misleading'
                          ? 'bg-amber-500'
                          : ex.verdict === 'too_new'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {ex.verdict.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                  {ex.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{ex.snippet}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
