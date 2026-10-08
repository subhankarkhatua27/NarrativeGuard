import type {
  ExampleItem,
  StageEvent,
  AnalysisResult,
  CheckClaimResponse,
  GetJobResponse,
} from './types';

// ---- 8 pipeline stages with labels matching the progress view ----
export const STAGE_LABELS: { stage: StageEvent['stage']; label: string }[] = [
  { stage: 'started', label: 'Reading the message' },
  { stage: 'claim_analysis', label: 'Classifying the claim' },
  { stage: 'factcheck_search', label: 'Searching fact-checks' },
  { stage: 'archive_search', label: 'Searching our archive' },
  { stage: 'news_search', label: 'Searching trusted news' },
  { stage: 'evidence_built', label: 'Weighing evidence' },
  { stage: 'evidence_check', label: 'Checking the evidence' },
  { stage: 'verdict', label: 'Deciding the verdict' },
];

// ---- Mock example results (a–d) ----

const mockA: AnalysisResult = {
  verdict: 'misleading',
  confidence: 0.86,
  basis: 'Multiple fact-checkers (PIB, Alt News) and the RBI holiday list confirm no gazette notification exists declaring all Saturdays as bank holidays. The circulating document is fabricated.',
  claim_text:
    'Gazette Notification saying all Saturdays are bank holidays from next month',
  cleaned_text:
    'Gazette Notification saying all Saturdays are bank holidays from next month',
  verified_fact: {
    summary:
      'No gazette notification declares all Saturdays as bank holidays.',
    details:
      'The Reserve Bank of India publishes its holiday list annually under the Negotiable Instruments Act. Saturdays are not uniformly listed as holidays; only specific national holidays that fall on Saturdays result in bank closures. Multiple fact-checkers have confirmed that no such gazette notification exists.',
  },
  red_flags: [
    { type: 'fake_document', text: 'The circulating "gazette notification" is a fabricated image with no official seal or reference number.' },
    { type: 'official_sounding', text: 'Uses the word "Gazette Notification" to lend false authority.' },
    { type: 'no_primary_source', text: 'No link to an official RBI or Ministry of Finance circular is provided.' },
    { type: 'viral_pattern', text: 'This message has circulated multiple times since 2019, resurging annually.' },
  ],
  diff_spans: [
    { start: 0, end: 20, type: 'fabrication', note: 'Claims a "Gazette Notification" exists — no such document has been published.' },
    { start: 28, end: 63, type: 'exaggeration', note: '"all Saturdays are bank holidays" is an overgeneralization; RBI does not designate all Saturdays as holidays.' },
  ],
  sources: [
    {
      url: 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1740000',
      title: 'No gazette notification declaring all Saturdays as bank holidays',
      publisher: 'PIB Fact Check',
      date: '2024-06-14',
      tier: 'T1',
      relation: 'contradicts',
      snippet:
        'PIB Fact Check has confirmed that no gazette notification has been issued declaring all Saturdays as bank holidays. The claim is false.',
    },
    {
      url: 'https://www.rbi.org.in/Scripts/BS_ViewHolidayList.aspx',
      title: 'Bank Holidays — Reserve Bank of India',
      publisher: 'RBI',
      date: '2024-01-02',
      tier: 'T1',
      relation: 'contradicts',
      snippet:
        'The RBI holiday list under the Negotiable Instruments Act does not list all Saturdays as bank holidays.',
    },
    {
      url: 'https://www.altnews.in/no-all-saturdays-are-not-bank-holidays',
      title: 'No, all Saturdays are not bank holidays — fake gazette notification circulates again',
      publisher: 'Alt News',
      date: '2024-06-15',
      tier: 'T2',
      relation: 'contradicts',
      snippet:
        'A fabricated gazette notification claiming all Saturdays are bank holidays has resurfaced on WhatsApp. It is fake.',
    },
    {
      url: 'https://economictimes.indiatimes.com/wealth/personal-finance-news/no-saturday-is-not-a-bank-holiday/articleshow/108000000.cms',
      title: 'Saturday is not a bank holiday, despite what the viral message says',
      publisher: 'Economic Times',
      date: '2024-06-16',
      tier: 'T2',
      relation: 'context',
      snippet:
        'Banks remain open on Saturdays except when a national holiday falls on that day, as per RBI guidelines.',
    },
  ],
  seen_before: { found: false, job_id: null, claim_hash: '' },
  created_at: '2024-06-16T10:30:00Z',
};

const mockB: AnalysisResult = {
  verdict: 'contradicted',
  confidence: 0.93,
  basis: 'The Election Commission of India and the Supreme Court have both confirmed EVM integrity. No technical demonstration of tampering has succeeded in open challenges. The claim provides no evidence.',
  claim_text: 'EVM machines were hacked in the last election to change votes',
  cleaned_text: 'EVM machines were hacked in the last election to change votes',
  verified_fact: {
    summary: 'No credible evidence of EVM hacking in any recent Indian election.',
    details:
      'The Election Commission of India has repeatedly demonstrated the integrity of EVMs through VVPAT audits, mock polls, and open challenges. No proven case of EVM tampering has been established. The Supreme Court has upheld EVM reliability multiple times.',
  },
  red_flags: [
    { type: 'conspiracy', text: 'Claims hacking without providing any technical evidence or named source.' },
    { type: 'disputed_by_authority', text: 'Directly contradicts Election Commission and Supreme Court findings.' },
    { type: 'emotionally_charged', text: 'Designed to undermine trust in democratic institutions.' },
  ],
  diff_spans: [
    { start: 0, end: 11, type: 'fabrication', note: 'Asserts EVMs were hacked — no evidence or verified report supports this.' },
    { start: 12, end: 53, type: 'twist', note: '"to change votes" implies a proven outcome alteration; no such case exists.' },
  ],
  sources: [
    {
      url: 'https://ecisveep.nic.in/faq/evm-frequently-asked-questions/',
      title: 'EVM Frequently Asked Questions — Election Commission of India',
      publisher: 'ECI',
      date: '2024-03-20',
      tier: 'T1',
      relation: 'contradicts',
      snippet:
        'EVMs are standalone, non-networkable devices. They cannot be hacked remotely. VVPAT verification adds an auditable paper trail.',
    },
    {
      url: 'https://www.supremecourt.in/judgments/evm-vvpat-verification',
      title: 'Supreme Court judgment on EVM-VVPAT verification',
      publisher: 'Supreme Court of India',
      date: '2024-04-26',
      tier: 'T1',
      relation: 'contradicts',
      snippet:
        'The Court found no basis to doubt the integrity of EVMs and noted that VVPAT verification provides sufficient safeguards.',
    },
    {
      url: 'https://www.altnews.in/no-evidence-evms-hacked-indian-elections',
      title: 'No evidence that EVMs were hacked in Indian elections',
      publisher: 'Alt News',
      date: '2024-05-02',
      tier: 'T2',
      relation: 'contradicts',
      snippet:
        'Claims of EVM hacking have been repeatedly debunked. No technical demonstration of tampering has succeeded in ECI open challenges.',
    },
  ],
  seen_before: { found: false, job_id: null, claim_hash: '' },
  created_at: '2024-05-02T14:15:00Z',
};

const mockC: AnalysisResult = {
  verdict: 'too_new',
  confidence: 0.61,
  basis: 'No verified news outlet or fact-checker has published a confirmed report on this incident. The claim originates from unverified WhatsApp forwards. We cannot verify it at this time.',
  claim_text: 'Breaking: bridge collapse in a city, reports on WhatsApp say dozens trapped',
  cleaned_text: 'Breaking: bridge collapse in a city, reports on WhatsApp say dozens trapped',
  verified_fact: {
    summary: 'This claim is too recent to verify against established fact-check reports.',
    details:
      'No verified news outlet or fact-checker has published a confirmed report on this incident at the time of analysis. The claim originates from unverified WhatsApp forwards. We recommend waiting for confirmation from established news organizations before sharing.',
  },
  red_flags: [
    { type: 'unverified_source', text: 'Originates from WhatsApp forwards with no named journalist or outlet.' },
    { type: 'breaking_label', text: 'Uses "Breaking:" to create urgency and discourage verification.' },
    { type: 'no_location_detail', text: 'Refers to "a city" without naming a specific location, a common viral-message pattern.' },
  ],
  diff_spans: [
    { start: 0, end: 8, type: 'twist', note: '"Breaking:" label is used to manufacture urgency — no confirmed report exists yet.' },
    { start: 44, end: 73, type: 'exaggeration', note: '"dozens trapped" is an unverified casualty figure from anonymous WhatsApp messages.' },
  ],
  sources: [
    {
      url: 'https://www.reuters.com/world/bridge-safety',
      title: 'How to evaluate breaking news on social media',
      publisher: 'Reuters',
      date: '2024-08-10',
      tier: 'T1',
      relation: 'context',
      snippet:
        'Reuters guidance on evaluating breaking claims: wait for confirmation from a named wire service before sharing unverified incident reports.',
    },
    {
      url: 'https://www.boomlive.in/verify-before-sharing-breaking-news',
      title: 'How to verify breaking news before you share it',
      publisher: 'BOOM',
      date: '2024-07-22',
      tier: 'T2',
      relation: 'context',
      snippet:
        'BOOM fact-check guide: breaking news on WhatsApp often lacks location, time, and named sources. Check established outlets first.',
    },
    {
      url: 'https://emergency.cdc.gov/verifyrumors',
      title: 'Verifying disaster reports on social media',
      publisher: 'CDC Emergency Preparedness',
      date: '2024-03-05',
      tier: 'T3',
      relation: 'context',
      snippet:
        'Disaster rumors spread quickly on messaging apps. Look for confirmation from local authorities or established news agencies.',
    },
  ],
  seen_before: { found: false, job_id: null, claim_hash: '' },
  created_at: '2024-08-12T08:45:00Z',
};

const mockD: AnalysisResult = {
  verdict: 'unverifiable',
  confidence: 0.44,
  basis: 'No official notification of a UPI transaction tax has been issued by the Ministry of Finance or RBI. The claim has circulated in various forms since 2022 and has been debunked each time. We cannot verify any version of it.',
  claim_text: 'A new tax on UPI payments starts next week, 1% per transaction',
  cleaned_text: 'A new tax on UPI payments starts next week, 1% per transaction',
  verified_fact: {
    summary: 'No official notification of a tax on UPI transactions has been issued.',
    details:
      'The Ministry of Finance and RBI have not announced any transaction tax on UPI payments. Similar claims have circulated since 2022 and have been debunked each time. The government has repeatedly stated UPI remains free for users.',
  },
  red_flags: [
    { type: 'no_primary_source', text: 'No circular, notification, or government press release is linked.' },
    { type: 'specific_sounding', text: 'The "1% per transaction" figure lends false precision to an unfounded claim.' },
    { type: 'urgency', text: '"starts next week" creates pressure to share before verifying.' },
    { type: 'recycled_claim', text: 'This claim has circulated in various forms since 2022 with different tax percentages.' },
  ],
  diff_spans: [
    { start: 0, end: 12, type: 'fabrication', note: '"A new tax" is asserted but no government notification exists.' },
    { start: 40, end: 67, type: 'exaggeration', note: '"1% per transaction" is a fabricated figure — no such rate has been proposed.' },
  ],
  sources: [
    {
      url: 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=1800000',
      title: 'No tax on UPI transactions — government clarifies',
      publisher: 'PIB Fact Check',
      date: '2024-09-01',
      tier: 'T1',
      relation: 'contradicts',
      snippet:
        'PIB Fact Check: No tax has been imposed on UPI transactions. The claim is false. UPI remains free for users.',
    },
    {
      url: 'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=58000',
      title: 'RBI press release on UPI transactions',
      publisher: 'RBI',
      date: '2024-08-28',
      tier: 'T1',
      relation: 'contradicts',
      snippet:
        'The RBI confirms that no transaction tax has been proposed for UPI payments.',
    },
    {
      url: 'https://www.thehindu.com/business/no-tax-on-upi-transactions/article68000000.ece',
      title: 'No tax on UPI transactions: Centre clarifies as fake message circulates',
      publisher: 'The Hindu',
      date: '2024-09-02',
      tier: 'T2',
      relation: 'contradicts',
      snippet:
        'A viral message claiming a 1% tax on UPI transactions is fake, the Finance Ministry has confirmed.',
    },
    {
      url: 'https://factly.in/no-upi-tax-recycled-claim',
      title: 'The UPI tax claim is recycled — and still false',
      publisher: 'Factly',
      date: '2024-09-03',
      tier: 'T3',
      relation: 'context',
      snippet:
        'This claim has appeared with different tax percentages since 2022. Each version has been debunked by official sources.',
    },
  ],
  seen_before: { found: false, job_id: null, claim_hash: '' },
  created_at: '2024-09-03T12:00:00Z',
};

export const MOCK_EXAMPLES: ExampleItem[] = [
  {
    id: 'gazette-saturdays',
    title: 'All Saturdays are bank holidays',
    verdict: 'misleading',
    snippet: 'A fake gazette notification claiming all Saturdays are now bank holidays.',
    claim_text: mockA.claim_text,
    result: mockA,
  },
  {
    id: 'evm-hacked',
    title: 'EVM machines were hacked',
    verdict: 'contradicted',
    snippet: 'Claims that EVMs were hacked to change votes in the last election.',
    claim_text: mockB.claim_text,
    result: mockB,
  },
  {
    id: 'bridge-collapse',
    title: 'Bridge collapse reports on WhatsApp',
    verdict: 'too_new',
    snippet: 'Breaking news of a bridge collapse spreading via WhatsApp forwards.',
    claim_text: mockC.claim_text,
    result: mockC,
  },
  {
    id: 'upi-tax',
    title: 'New tax on UPI payments',
    verdict: 'unverifiable',
    snippet: 'A viral message claiming a 1% per-transaction tax on UPI payments.',
    claim_text: mockD.claim_text,
    result: mockD,
  },
];

// ---- Mock seen_before response (same text submitted twice) ----
export const MOCK_SEEN_BEFORE: CheckClaimResponse = {
  job_id: null,
  from_cache: false,
  seen_before: {
    found: true,
    job_id: 'seen-001',
    claim_hash: 'sha256:abc123def456',
  },
  result: mockA,
};

// ---- Mock cached job (from_cache = true) ----
export function mockCheckClaim(text: string): CheckClaimResponse {
  // If text contains "offline", trigger n8n_offline error
  if (text.toLowerCase().includes('offline')) {
    throw {
      code: 'n8n_offline',
      message: 'The analysis service is temporarily offline.',
    };
  }

  // If text contains "seen" simulate seen_before
  if (text.toLowerCase().includes('seen before')) {
    return MOCK_SEEN_BEFORE;
  }

  // Match against known examples
  for (const ex of MOCK_EXAMPLES) {
    if (text.trim() === ex.claim_text.trim()) {
      return {
        job_id: ex.id,
        from_cache: true,
        seen_before: { found: false, job_id: null, claim_hash: '' },
      };
    }
  }

  // Default: new job
  const jobId = 'job-' + Math.random().toString(36).slice(2, 10);
  return {
    job_id: jobId,
    from_cache: false,
    seen_before: { found: false, job_id: null, claim_hash: '' },
  };
}

export function mockGetJob(id: string): GetJobResponse {
  const example = MOCK_EXAMPLES.find((e) => e.id === id);
  if (example) {
    return {
      status: 'completed',
      result: example.result,
    };
  }
  // New jobs start as queued — the stream will complete them
  return {
    status: 'queued',
  };
}

// ---- Stage detail data for the mock stream ----
const STAGE_DETAILS: Record<StageEvent['stage'], { text?: string; count?: number }> = {
  started: { text: 'Cleaning input and extracting the core claim.' },
  claim_analysis: { text: 'Identified a factual assertion about a government notification.' },
  factcheck_search: { text: 'Querying fact-check databases.', count: 3 },
  archive_search: { text: 'Searching previously checked claims.', count: 1 },
  news_search: { text: 'Searching trusted news outlets.', count: 5 },
  evidence_built: { text: 'Compiled 9 sources across 3 tiers.' },
  evidence_check: { text: 'Cross-referencing sources against the claim.' },
  verdict: { text: 'All evidence weighed. Verdict reached.' },
};

export function mockOpenStream(
  _id: string,
  onEvent: (event: StageEvent) => void,
  onComplete: (result: AnalysisResult) => void,
  signal?: AbortSignal,
): void {
  let i = 0;
  const total = STAGE_LABELS.length;
  const interval = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(interval);
      return;
    }
    if (i >= total) {
      clearInterval(interval);
      onComplete(mockA);
      return;
    }
    const stageInfo = STAGE_LABELS[i];
    onEvent({
      event: 'stage',
      stage: stageInfo.stage,
      label: stageInfo.label,
      detail: STAGE_DETAILS[stageInfo.stage],
      index: i,
      total,
      done: false,
    });
    i++;
  }, 1200);

  if (signal) {
    signal.addEventListener('abort', () => clearInterval(interval), { once: true });
  }
}
