import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getExamples } from '@/lib/api';
import type { ExampleItem } from '@/lib/types';
import { VERDICT_META, cut, keyOf } from '@/lib/ngHelpers';

export default function Examples() {
  const [items, setItems] = useState<ExampleItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    getExamples()
      .then((r) => alive && setItems(r))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Example checks</h1>
      <p className="mt-2 text-sm text-slate-600">
        These are saved results. They work even when live analysis is offline.
      </p>

      {items === null && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No examples yet.
        </p>
      )}

      {items !== null && items.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((ex) => {
            const meta = VERDICT_META[keyOf(ex.result)];
            return (
              <Link
                key={ex.id}
                to={`/e/${ex.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
              >
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}>
                  {meta.label}
                </span>
                <p className="mt-2 text-sm font-semibold text-slate-800 group-hover:text-teal-700">
                  {cut(ex.claim || ex.result?.claim, 140) || `Example ${ex.id}`}
                </p>
                <p className="mt-1 text-xs text-teal-700">View result</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
