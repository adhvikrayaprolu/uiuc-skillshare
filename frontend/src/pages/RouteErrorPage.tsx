import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { errorReportingEnabled, reportError } from '../lib/errorReporting';

export function RouteErrorPage() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  useEffect(() => {
    document.title = 'Something went wrong · Illini SkillShare';
    if (!notFound) reportError(error);
  }, [error, notFound]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center"><Logo showSubtitle={false} /></div>
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#B83E00]" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-[#0F172A]">{notFound ? "We couldn't find that page" : 'Something went wrong'}</h1>
        <p className="mt-2 text-sm text-[#475569]">
          {notFound ? 'The link may be old or mistyped.' : `This page hit an unexpected error.${errorReportingEnabled() ? " We've been notified." : ''} Reloading usually fixes it.`}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {!notFound && <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-[#13294B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b]">Reload page</button>}
          <Link to="/" className="rounded-xl border-2 border-[#13294B] px-5 py-2.5 text-sm font-semibold text-[#13294B] hover:bg-[#E8EEF7]">Go to the start</Link>
        </div>
      </div>
    </main>
  );
}
