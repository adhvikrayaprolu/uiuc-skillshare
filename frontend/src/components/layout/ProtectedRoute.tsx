import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { shouldUseMocks } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingStatus } from '../../hooks/useBootstrap';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  const onboardingStatus = useOnboardingStatus(auth.isAuthenticated && !auth.isDemo);

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!shouldUseMocks() && !auth.isDemo && onboardingStatus.isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-4 text-sm text-[#64748B] shadow-sm">
          Loading your Illini SkillSwap profile...
        </div>
      </div>
    );
  }

  const hasCompletedOnboarding = onboardingStatus.data?.has_completed_onboarding ?? auth.hasCompletedOnboarding;
  if (!shouldUseMocks() && !auth.isDemo && hasCompletedOnboarding === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
