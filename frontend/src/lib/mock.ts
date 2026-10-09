import type {
  ExampleItem,
  StageEvent,
  AnalysisResult,
  CheckClaimResponse,
  GetJobResponse,
  StageName,
} from './types';

export const STAGE_LABELS: { stage: StageName; label: string; seq: number }[] = [
  { stage: 'started', label: 'Reading the message', seq: 1 },
  { stage: 'claim_analysis', label: 'Classifying the claim', seq: 2 },
  { stage: 'factcheck_search', label: 'Searching fact-checks', seq: 10 },
  { stage: 'archive_search', label: 'Searching our archive', seq: 11 },
  { stage: 'news_search', label: 'Searching trusted news', seq: 12 },
  { stage: 'evidence_built', label: 'Weighing evidence', seq: 20 },
  { stage: 'evidence_check', label: 'Checking the evidence', seq: 21 },
  { stage: 'verdict', label: 'Deciding the verdict', seq: 30 },
];

const mockGazette: AnalysisResult = {
  verdict: 'Misleading',
  verdict_key: 'misleading',
  basis: 'Based on a fact-check by Newschecker',
  as_of: '2026-10-08T09:30:00Z',
  what_would_change: 'An official notification listing all Saturdays as bank holidays.',
  advice: "Don't forward",
  claim: 'All Saturdays are bank holidays',
  claim_type: 'fact',
  red_flags: [{ tactic: 'fake authority', span: 'Gazette notification' }],
  mutations: ['exaggeration', 'old_news'],
  diff_spans: [
    {
      span: 'all Saturdays',
      note: 'Only 2nd and 4th Saturdays are bank holidays.',
    },
  ],
  verified_fact: {
    text: 'Only the second and fourth Saturdays are bank holidays.',
    evidence_ids: ['E1'],
  },
  old_news: 'possibly_old',
  earliest_date: '2024-06-14',
  sources: [
    {
      id: 'E1',
      kind: 'factcheck',
      publisher: 'Newschecker',
      domain: 'newschecker.in',
      tier: 2,
      title: 'No, all Saturdays are not bank holidays',
      url: 'https://www.newschecker.in/fake-news/all-saturdays-bank-holidays',
      date: '2024-06-14',
      rating: 'misleading',
      relation: 'contradicts',
      snippet:
        'A fabricated gazette notification claiming all Saturdays are bank holidays has resurfaced. Only the second and fourth Saturdays are holidays.',
      syndicated_by: [],
      fc_match: true,
    },
    {
      id: 'E2',
      kind: 'news',
      publisher: 'Economic Times',
      domain: 'economictimes.indiatimes.com',
      tier: 3,
      title: 'Saturday is not a bank holiday, despite the viral message',
      url: 'https://economictimes.indiatimes.com/wealth/personal-finance-news/no-saturday-is-not-a-bank-holiday/articleshow/108000000.cms',
      date: '2024-06-16',
      relation: 'background',
      snippet:
        'Banks remain open on Saturdays except the second and fourth Saturdays, as per RBI guidelines.',
      syndicated_by: [],
      fc_match: false,
    },
  ],
};

const mockEvm: AnalysisResult = {
  verdict: 'Contradicted',
  verdict_key: 'contradicted',
  basis: 'The Election Commission of India and multiple fact-checks found no evidence of EVM hacking.',
  as_of: '2026-10-08T11:00:00Z',
  what_would_change: 'A documented, independently verified case of remote EVM tampering in a live election.',
  advice: "Don't forward",
  claim: 'EVM machines were hacked in the last election to change votes',
  claim_type: 'fact',
  red_flags: [{ tactic: 'fear', span: 'hacked in the last election' }],
  mutations: ['fabrication'],
  diff_spans: [
    {
      span: 'hacked in the last election',
      note: 'No verified report shows EVMs were hacked in a recent Indian election.',
    },
  ],
  verified_fact: {
    text: 'EVMs are standalone devices. No proven case of remote hacking in Indian elections has been established.',
    evidence_ids: ['E1'],
  },
  old_news: 'recent',
  sources: [
    {
      id: 'E1',
      kind: 'factcheck',
      publisher: 'Alt News',
      domain: 'altnews.in',
      tier: 2,
      title: 'No evidence that EVMs were hacked in Indian elections',
      url: 'https://www.altnews.in/no-evidence-evms-hacked-indian-elections',
      date: '2024-05-02',
      rating: 'false',
      relation: 'contradicts',
      snippet:
        'Claims of EVM hacking have been repeatedly debunked. No technical demonstration of tampering has succeeded in ECI open challenges.',
      syndicated_by: [],
      fc_match: true,
    },
    {
      id: 'E2',
      kind: 'archive',
      publisher: 'Election Commission of India',
      domain: 'eci.gov.in',
      tier: 1,
      title: 'EVM Frequently Asked Questions',
      url: 'https://ecisveep.nic.in/faq/evm-frequently-asked-questions/',
      date: '2024-03-20',
      relation: 'contradicts',
      snippet:
        'EVMs are standalone, non-networkable devices. They cannot be hacked remotely.',
      syndicated_by: [],
      fc_match: false,
    },
  ],
};

const mockBridge: AnalysisResult = {
  verdict: 'Too new to verify',
  verdict_key: 'too_new',
  basis: 'No verified news outlet or fact-checker has published a confirmed report on this incident.',
  as_of: '2026-10-08T14:15:00Z',
  what_would_change: 'A named report from a wire service or local authority confirming the collapse.',
  advice: 'Wait',
  claim: 'Breaking: bridge collapse in a city, reports on WhatsApp say dozens trapped',
  claim_type: 'breaking_event',
  red_flags: [{ tactic: 'urgency', span: 'Breaking:' }],
  mutations: ['exaggeration'],
  diff_spans: [
    {
      span: 'dozens trapped',
      note: 'Casualty figures come only from anonymous forwards, not named reporting.',
    },
  ],
  verified_fact: null,
  old_news: 'cant_tell',
  sources: [
    {
      id: 'E1',
      kind: 'news',
      publisher: 'Reuters',
      domain: 'reuters.com',
      tier: 3,
      title: 'How to evaluate breaking news on social media',
      url: 'https://www.reuters.com/world/bridge-safety',
      date: '2024-08-10',
      relation: 'background',
      snippet:
        'Wait for confirmation from a named wire service before sharing unverified incident reports.',
      syndicated_by: [],
      fc_match: false,
    },
  ],
};

export const MOCK_EXAMPLES: ExampleItem[] = [
  {
    id: 'gazette-saturdays',
    claim: 'Gazette notification saying all Saturdays are bank holidays from next month',
    lang: 'en',
    expected_verdict: 'misleading',
    featured: true,
    result: mockGazette,
  },
  {
    id: 'evm-hacked',
    claim: 'EVM machines were hacked in the last election to change votes',
    lang: 'en',
    expected_verdict: 'contradicted',
    featured: true,
    result: mockEvm,
  },
  {
    id: 'bridge-collapse',
    claim: 'Breaking: bridge collapse in a city, reports on WhatsApp say dozens trapped',
    lang: 'en',
    expected_verdict: 'too_new',
    featured: false,
    result: mockBridge,
  },
];

const MOCK_SEEN_BEFORE: CheckClaimResponse = {
  job_id: null,
  from_cache: false,
  redactions: [],
  seen_before: {
    found: true,
    verdicts: [
      {
        claim: mockGazette.claim,
        result: mockGazette,
        similarity: 0.94,
      },
    ],
    archive: [
      {
        title: 'No, all Saturdays are not bank holidays',
        url: 'https://www.newschecker.in/fake-news/all-saturdays-bank-holidays',
        source: 'Newschecker',
        domain: 'newschecker.in',
        tier: 2,
        published_at: '2024-06-14',
        similarity: 0.91,
      },
    ],
  },
};

function throwMockError(code: string, message: string): never {
  throw { code, message };
}

export function mockCheckClaim(
  text: string,
  _opts?: { force?: boolean },
): CheckClaimResponse {
  const lower = text.toLowerCase();

  if (lower.includes('offline')) {
    throwMockError('n8n_offline', 'The analysis service is temporarily offline.');
  }

  if (lower.includes('seen before')) {
    return MOCK_SEEN_BEFORE;
  }

  const cleanInput = text.trim().toLowerCase();

  for (const ex of MOCK_EXAMPLES) {
    const exClaim = (ex.claim || '').trim().toLowerCase();
    const exId = ex.id.toLowerCase();
    if (
      cleanInput === exClaim ||
      cleanInput === exId ||
      (exClaim.length > 10 && cleanInput.includes(exClaim.substring(0, 15)))
    ) {
      return {
        job_id: ex.id,
        from_cache: true,
        result: ex.result,
        redactions: [],
        seen_before: null,
      };
    }
  }

  const jobId = 'job-' + Math.random().toString(36).slice(2, 10);
  return {
    job_id: jobId,
    from_cache: false,
    redactions: [],
    seen_before: null,
  };
}

export function mockGetJob(id: string): GetJobResponse {
  const example = MOCK_EXAMPLES.find((e) => e.id === id);
  if (example) {
    return {
      job_id: id,
      status: 'done',
      result: example.result,
      error: null,
      events: STAGE_LABELS.map((s) => ({
        seq: s.seq,
        stage: s.stage,
        status: 'done',
        detail: s.seq >= 10 && s.seq <= 12 ? { count: 1 } : null,
      })),
    };
  }
  return {
    job_id: id,
    status: 'queued',
    result: null,
    error: null,
    events: [],
  };
}

export function mockOpenStream(
  id: string,
  onStage: (event: StageEvent) => void,
  onComplete: (result: AnalysisResult) => void,
  _onFailed: (error: { code: string; message: string }) => void,
  signal?: AbortSignal,
): void {
  let i = 0;
  const example = MOCK_EXAMPLES.find((e) => e.id === id);
  const targetResult = example?.result || mockGazette;

  const interval = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(interval);
      return;
    }
    if (i >= STAGE_LABELS.length) {
      clearInterval(interval);
      onComplete(targetResult);
      return;
    }
    const stageInfo = STAGE_LABELS[i];
    const isSearch = stageInfo.seq >= 10 && stageInfo.seq <= 12;
    onStage({
      seq: stageInfo.seq,
      stage: stageInfo.stage,
      status: 'done',
      detail: isSearch ? { count: stageInfo.seq === 10 ? 1 : stageInfo.seq === 11 ? 0 : 2 } : null,
    });
    i++;
  }, 1200);

  if (signal) {
    signal.addEventListener('abort', () => clearInterval(interval), { once: true });
  }
}
