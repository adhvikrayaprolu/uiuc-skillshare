import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingStatus } from '../../hooks/useBootstrap';
import { APP_HOME, SETUP_HOME } from '../../lib/routes';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  const onboardingStatus = useOnboardingStatus(auth.isAuthenticated);
  const destination = `${location.pathname}${location.search}`;

  if (auth.isLoading) return <p role="status" className="p-6">Restoring your session…</p>;

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: destination }} />;
  }

  if (onboardingStatus.isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div role="status" className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-4 text-sm text-[#64748B] shadow-sm">
          Loading your Illini SkillShare profile...
        </div>
      </div>
    );
  }

  if (onboardingStatus.isError) return <div role="alert" className="p-6">Could not check your profile status. <button type="button" className="font-semibold underline" onClick={() => void onboardingStatus.refetch()}>Try again</button></div>;
  const setupComplete = onboardingStatus.data?.has_completed_onboarding ?? auth.hasCompletedOnboarding;
  const inSetup = location.pathname === SETUP_HOME || location.pathname.startsWith(`${SETUP_HOME}/`);
  if (!setupComplete && !inSetup) {
    return <Navigate to={SETUP_HOME} replace state={{ from: destination }} />;
  }
  if (setupComplete && location.pathname === SETUP_HOME) {
    return <Navigate to={APP_HOME} replace />;
  }

  return <Outlet />;
}
