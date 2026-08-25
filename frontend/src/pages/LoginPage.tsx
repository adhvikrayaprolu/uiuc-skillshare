import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/ToastProvider';
import { shouldUseMocks } from '../lib/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const toast = useToast();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';
  const useMocks = shouldUseMocks();

  useEffect(() => {
    if (!googleClientId) return;
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existingScript || document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    if (!existingScript) document.head.appendChild(script);
    if (window.google?.accounts?.id) {
      window.setTimeout(() => setGoogleReady(true), 0);
    }
  }, [googleClientId]);

  useEffect(() => {
    if (!googleClientId || !googleReady || !googleButtonRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        if (!response.credential) {
          toast.error('Google did not return an ID token.');
          return;
        }
        try {
          const user = await auth.loginWithGoogleIdToken(response.credential);
          toast.success('Signed in with your Illinois Google account.');
          navigate(user.hasCompletedOnboarding ? from : '/onboarding', { replace: true });
        } catch {
          toast.error('Google sign-in failed. Use an Illinois account or local API demo login.');
        }
      },
    });
    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 360,
      text: 'continue_with',
    });
  }, [auth, from, googleClientId, googleReady, navigate, toast]);

  const handleMockDemoLogin = () => {
    auth.loginDemo();
    toast.success('Mock demo session started (local data only).');
    navigate('/dashboard');
  };

  const handleLocalApiDemoLogin = async () => {
    try {
      const user = await auth.loginLocalApiDemoUser();
      toast.success('Signed in as local API demo user (Django database).');
      navigate(user.hasCompletedOnboarding ? from : '/onboarding', { replace: true });
    } catch {
      toast.error('Dev login failed. Run Django with DEBUG=True and check the API URL in .env.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-lg">
          <div className="mb-8 flex justify-center">
            <Logo showSubtitle={true} />
          </div>

          <div className="mb-6 text-center">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                useMocks
                  ? 'border border-[#13294B]/20 bg-[#E8EEF7] text-[#13294B]'
                  : 'border border-[#FF5F05]/30 bg-[#FFF3EA] text-[#C2410C]'
              }`}
            >
              {useMocks ? 'Mock demo mode' : 'Local API mode'}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-[#0F172A]">Sign in to Illini SkillSwap</h2>
            <p className="mt-2 text-[#64748B]">
              {useMocks
                ? 'Mock mode uses in-browser demo data (no Django required).'
                : 'API mode uses your Django database with JWT authentication.'}
            </p>
          </div>

          {googleClientId ? (
            <div className="mb-4">
              <p className="mb-2 text-center text-xs font-medium text-[#64748B]">Illinois Google (optional)</p>
              <div ref={googleButtonRef} className="flex justify-center" />
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
              <p className="text-sm font-medium text-[#0F172A]">Google sign-in</p>
              <p className="mt-1 text-xs text-[#64748B]">Set VITE_GOOGLE_CLIENT_ID to enable. Not required for class demo.</p>
            </div>
          )}

          {useMocks ? (
            <button
              type="button"
              onClick={handleMockDemoLogin}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl bg-[#13294B] px-6 py-4 font-semibold text-white transition-colors hover:bg-[#1a3a6b]"
            >
              Continue as Mock Demo User
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLocalApiDemoLogin}
              disabled={auth.isLoading}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl bg-[#13294B] px-6 py-4 font-semibold text-white transition-colors hover:bg-[#1a3a6b] disabled:opacity-60"
            >
              {auth.isLoading ? 'Signing in…' : 'Continue as Local API Demo User'}
            </button>
          )}

          {!useMocks && (
            <p className="mb-4 text-center text-xs text-[#64748B]">
              Signs in as <strong className="text-[#0F172A]">Adhvik Rayaprolu</strong> (adhvik.rayaprolu@illinois.edu) via{' '}
              <code className="rounded bg-[#F1F5F9] px-1 text-[#0F172A]">POST /api/auth/dev-login/</code> when{' '}
              <code className="rounded bg-[#F1F5F9] px-1">DEBUG=True</code>.
            </p>
          )}

          <div className="space-y-4 border-t border-[#E2E8F0] pt-6">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#13294B]" />
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Verified students</p>
                <p className="text-xs text-[#64748B]">Dev login is limited to @illinois.edu on the backend.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#13294B]" />
              <div>
                <p className="text-sm font-medium text-[#0F172A]">You control your privacy</p>
                <p className="text-xs text-[#64748B]">Choose what contact information appears on your profile.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-[#13294B] transition-colors hover:text-[#FF5F05]">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
