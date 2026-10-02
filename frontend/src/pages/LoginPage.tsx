import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/ToastProvider';
import { requestEmailCode, resendEmailCode } from '../lib/authApi';
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
  const destination = (location.state as { from?: string } | null)?.from;
  const from = destination?.startsWith('/') && !destination.startsWith('//') ? destination : '/dashboard';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
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
          toast.error('Google could not verify this account. Continue with an Illinois email code.');
        }
      },
    });
    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: 'outline',
      size: 'large',
      width: 280,
      text: 'continue_with',
    });
  }, [auth, from, googleClientId, googleReady, navigate, toast]);

  const handleMockDemoLogin = () => {
    auth.loginDemo();
    toast.success('Mock demo session started (local data only).');
    navigate('/dashboard');
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault(); setPending(true); setError('');
    try {
      if (!challenge) {await requestEmailCode(email.trim().toLowerCase()); setChallenge(true);}
      else {const user = await auth.confirmEmailCode(code); navigate(user.hasCompletedOnboarding ? from : '/onboarding', {replace: true});}
    } catch {setError(challenge ? 'Code is incorrect or expired. After three failed attempts, request a new code.' : 'Could not send a code. Use an Illinois email address and wait before trying again.');}
    finally {setPending(false);}
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-lg">
          <div className="mb-8 flex justify-center">
            <Logo showSubtitle={true} />
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-[#0F172A]">Sign in to UIUC SkillShare</h2>
            <p className="mt-2 text-[#64748B]">Find peers who can help, and share what you know.</p>
          </div>
          {googleClientId ? <div className="mb-6"><div ref={googleButtonRef} className="flex justify-center" /></div> : <p className="mb-4 text-center text-sm text-[#64748B]">Google sign-in is unavailable here. Use an Illinois email code.</p>}
          <form onSubmit={submitCode} className="mb-6 space-y-3">
            <label className="block text-sm font-medium" htmlFor="login-email">Illinois email</label>
            <input id="login-email" type="email" autoComplete="email" required disabled={challenge || pending} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@illinois.edu" className="w-full rounded-lg border border-[#CBD5E1] p-3" />
            {challenge && <><label className="block text-sm font-medium" htmlFor="login-code">Email code</label><input id="login-code" autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} className="w-full rounded-lg border border-[#CBD5E1] p-3" /><p className="text-xs text-[#64748B]">Check your inbox. Codes expire in five minutes.</p></>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button disabled={pending} className="w-full rounded-xl bg-[#13294B] p-3 font-semibold text-white disabled:opacity-60">{pending ? 'Please wait…' : challenge ? 'Verify and sign in' : 'Send email code'}</button>
            {challenge && <div className="flex justify-between text-sm"><button type="button" disabled={pending} onClick={async () => {setPending(true); try {await resendEmailCode(); toast.success('A new code was sent.');} catch {setError('Please wait before resending, or start again.');} finally {setPending(false);}}}>Resend code</button><button type="button" onClick={() => {setChallenge(false); setCode(''); setError('');}}>Use another email</button></div>}
          </form>
          {useMocks && <button type="button" onClick={handleMockDemoLogin} className="mb-4 w-full rounded-lg border p-3">Explore synthetic demo data</button>}

          <div className="space-y-4 border-t border-[#E2E8F0] pt-6">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#13294B]" />
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Illinois email access</p>
                <p className="text-xs text-[#64748B]">An Illinois email establishes access, not university approval or verified current enrollment.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#13294B]" />
              <div>
                <p className="text-sm font-medium text-[#0F172A]">You control your privacy</p>
                <p className="text-xs text-[#64748B]">Selected contacts are shared only after a help request is accepted.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-sm text-[#13294B] transition-colors hover:text-[#B83E00]">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
