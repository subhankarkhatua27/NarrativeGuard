import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface ErrorCardProps {
  message: string;
}

export default function ErrorCard({ message }: ErrorCardProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-red-900">Analysis failed</h1>
        <p className="mt-2 text-sm leading-relaxed text-red-700">{message}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
