import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getExamples } from '@/lib/api';
import type { ExampleItem } from '@/lib/types';
import ResultView from '@/components/ResultView';

export default function SavedExample() {
  const { id } = useParams();
  const [item, setItem] = useState<ExampleItem | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getExamples()
      .then((list) => alive && setItem(list.find((e) => String(e.id) === id) ?? null))
      .catch(() => alive && setItem(null));
    return () => {
      alive = false;
    };
  }, [id]);

  if (item === undefined) {
    return <p className="px-4 py-16 text-center text-sm text-slate-500">Loading example...</p>;
  }

  if (item === null || !item.result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-base font-semibold text-slate-700">This example could not be found.</p>
        <Link to="/examples" className="mt-3 inline-block text-sm font-medium text-teal-700 underline">
          Back to examples
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Saved example, not a live check
        </span>
        <Link to="/examples" className="ml-3 text-xs font-medium text-teal-700 underline">
          All examples
        </Link>
      </div>
      <ResultView result={item.result} />
    </div>
  );
}
