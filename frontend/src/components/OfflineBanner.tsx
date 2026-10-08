import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, FileText } from 'lucide-react';
import { useState } from 'react';

export default function OfflineBanner() {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            Live analysis is temporarily offline. Try the example claims.
          </p>
          <div className="mt-2">
            <button
              onClick={() => navigate('/examples')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              <FileText className="h-4 w-4" />
              See examples
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-amber-600 transition hover:bg-amber-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
