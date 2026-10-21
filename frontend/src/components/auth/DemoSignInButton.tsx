import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthConfig } from '../../hooks/useAuthConfig';
import { useToast } from '../ui/ToastProvider';
import { APP_HOME } from '../../lib/routes';

/** One-click sign-in to the seeded demo network. The server only offers it in local development. */
export function DemoSignInButton({ account, className, children }: { account?: 'staff'; className: string; children: React.ReactNode }) {
  const config = useAuthConfig();
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  if (!config.data?.demoEnabled) return null;
  const start = async () => {
    setPending(true);
    try {
      await auth.loginDemo(account);
      navigate(account === 'staff' ? '/analytics' : APP_HOME, { replace: true });
    } catch {
      toast.error('The demo account is not available. Run make dev to seed it.');
    } finally {
      setPending(false);
    }
  };
  return <button type="button" disabled={pending} onClick={() => void start()} className={className}>{pending ? 'Opening the demo…' : children}</button>;
}
