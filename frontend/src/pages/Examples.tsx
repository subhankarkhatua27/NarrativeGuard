import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { getExamples } from '@/lib/api';
import type { ExampleItem } from '@/lib/types';

export default function Examples() {
  const [examples, setExamples] = useState<ExampleItem[]>([]);

  useEffect(() => {
    getExamples()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to check
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Example claims</h1>
      <p className="mt-2 text-sm text-slate-600">
        See how NarrativeGuard breaks down real-world forwarded messages.
      </p>

      <div className="mt-6 space-y-4">
        {examples.map((ex) => (
          <Link
            key={ex.id}
            to={`/e/${ex.id}`}
            className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      ex.expected_verdict === 'contradicted'
                        ? 'bg-red-500'
                        : ex.expected_verdict === 'misleading'
                          ? 'bg-amber-500'
                          : ex.expected_verdict === 'too_new'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {(ex.expected_verdict || 'example').replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                  {ex.claim || ex.id}
                </h2>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
