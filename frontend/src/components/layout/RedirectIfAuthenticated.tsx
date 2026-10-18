import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { APP_HOME, SETUP_HOME, safeDestination } from '../../lib/routes';

export function RedirectIfAuthenticated() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <p role="status" className="p-6 text-sm text-[#64748B]">Loading…</p>;
  }

  if (auth.isAuthenticated) {
    if (auth.hasCompletedOnboarding === false && !auth.isDemo) return <Navigate to={SETUP_HOME} replace />;
    const from = safeDestination((location.state as { from?: string } | null)?.from);
    return <Navigate to={from || APP_HOME} replace />;
  }

  return <Outlet />;
}
