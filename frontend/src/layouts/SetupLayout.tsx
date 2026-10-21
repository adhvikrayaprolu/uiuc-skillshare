import { Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/ToastProvider';

export function SetupLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const signOut = async () => {
    try {
      await auth.logout();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo showSubtitle={false} />
          <button type="button" onClick={() => void signOut()} className="text-sm font-medium text-[#475569] hover:text-[#0F172A]">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
