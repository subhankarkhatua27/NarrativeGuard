import { VERDICT_META } from '@/lib/ngHelpers';
import type { VerdictKey } from '@/lib/types';
import { REPORT_URL } from '@/lib/ngHelpers';

const STEPS = [
  'We pull out the claim from your message.',
  'We search professional fact-checkers, our own archive of recent fact-checks, and trusted news.',
  'An AI labels each piece of evidence: does it support, contradict, or have nothing to do with the claim?',
  'Plain code, not the AI, decides the verdict from fixed rules.',
];

const TIERS: [string, string, string][] = [
  ['Tier 1', 'Official', 'Government releases and official statements.'],
  ['Tier 2', 'Professional fact-checkers', 'Alt News, Factly, Newschecker, Vishvas News and others.'],
  ['Tier 3', 'Trusted news', 'Established outlets and wire services.'],
  ['Tier 4', 'Everything else', 'A signal only. Never used as evidence.'],
];

const MEANING: Record<VerdictKey, string> = {
  supported: 'At least two independent reliable sources back the claim.',
  contradicted: 'A top-tier source directly addresses the claim and says it is wrong.',
  misleading: 'Some facts are real, but the message twists, omits or reframes them.',
  disputed: 'Credible sources disagree with each other.',
  too_new: 'A breaking event with only early or single-source reporting.',
  unverifiable: 'There is not enough reliable evidence either way.',
  not_checkable: 'An opinion or a prediction, so there is no fact to check.',
};

const LIMITS = [
  'Sources are mostly English and Hindi. Bengali and other languages are limited.',
  'Very new or very local rumours may not be covered yet.',
  'The AI can make mistakes, and a fact-check may match the topic but not your exact claim.',
  'This is not legal, medical or financial advice.',
  'Free-tier AI prompts may be used by the provider (Google, and possibly Groq) to improve their models.',
  'Live analysis runs on a personal computer and can sometimes be offline. Saved examples always work.',
];

const TRICKS: [string, string][] = [
  ['"Forwarded many times"', 'A forward label says how far it spread, not whether it is true.'],
  ['Screenshots of news sites', 'Open the real site yourself. Screenshots are easy to fake.'],
  ['Old videos with new captions', 'Search a few key words with the year. Old footage is often reposted as new.'],
];

export default function About() {
  const h2 = 'text-lg font-semibold text-slate-900';
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">About &amp; Limits</h1>
        <p className="mt-2 text-sm text-slate-600">
          NarrativeGuard checks forwarded messages against fact-checkers and trusted news. It can say
          &quot;can&apos;t verify&quot;, and that is on purpose.
        </p>
      </header>

      <section>
        <h2 className={h2}>How we check</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className={h2}>Source tiers</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {TIERS.map(([t, name, desc]) => (
                <tr key={t}>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{t}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{name}</td>
                  <td className="px-4 py-3 text-slate-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className={h2}>Verdicts we use</h2>
        <ul className="mt-3 space-y-2">
          {(Object.keys(MEANING) as VerdictKey[]).map((k) => (
            <li key={k} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT_META[k].chip}`}>
                {VERDICT_META[k].label}
              </span>
              <span className="text-sm text-slate-700">{MEANING[k]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
          We never say &quot;fake&quot; just because we found nothing. &quot;Unverifiable&quot; is a
          deliberate, honest answer.
        </p>
      </section>

      <section>
        <h2 className={h2}>Limits</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={h2}>Spot the tricks</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {TRICKS.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={h2}>Report a wrong verdict</h2>
        <a
          href={REPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-teal-700 shadow-sm hover:bg-slate-50"
        >
          Open an issue on GitHub
        </a>
      </section>
    </div>
  );
}
