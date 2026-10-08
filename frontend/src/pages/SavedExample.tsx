import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function SavedExample() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to check
      </Link>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Example: {id}</h1>
        <p className="mt-2 text-sm text-slate-500">
          The full example result page will be rendered here.
        </p>
      </div>
    </div>
  );
}
