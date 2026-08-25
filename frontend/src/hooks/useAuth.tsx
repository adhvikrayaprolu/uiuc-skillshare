/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { clearAuth, clearDemoUser, getAccessToken, getDemoUser, getRefreshToken, isDemoSession, logout as clearSession, setTokens, startDemoSession, type DemoUser } from '../lib/auth';
import { getCurrentUser, loginWithDevEmail, loginWithGoogleIdToken } from '../lib/authApi';
import { api } from '../lib/api';

interface AuthContextValue {
  user: DemoUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean | null;
  loginDemo: () => DemoUser;
  startDemoSession: () => DemoUser;
  loginGoogleIdToken: (idToken: string) => Promise<DemoUser>;
  loginWithGoogleIdToken: (idToken: string) => Promise<DemoUser>;
  loginLocalApiDemoUser: () => Promise<DemoUser>;
  refreshSession: () => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => getDemoUser());
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());
  const [isLoading, setIsLoading] = useState(false);

  const toDemoUser = useCallback((apiUser: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    has_completed_onboarding: boolean;
    is_student_verified: boolean;
  }) => ({
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.first_name,
    lastName: apiUser.last_name,
    hasCompletedOnboarding: apiUser.has_completed_onboarding,
    isStudentVerified: apiUser.is_student_verified,
  }), []);

  const loginGoogle = useCallback(async (idToken: string) => {
    setIsLoading(true);
    try {
      const response = await loginWithGoogleIdToken(idToken);
      const nextUser = toDemoUser(response.user);
      setUser(nextUser);
      setAccessToken(response.access);
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  }, [toDemoUser]);

  const loginLocalApiDemoUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await loginWithDevEmail();
      const nextUser = toDemoUser(response.user);
      setUser(nextUser);
      setAccessToken(response.access);
      return nextUser;
    } finally {
      setIsLoading(false);
    }
  }, [toDemoUser]);

  const refreshSession = useCallback(async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
      const { data } = await api.post<{ access: string }>('/auth/token/refresh/', { refresh });
      setTokens(data.access, refresh);
      setAccessToken(data.access);
      const currentUser = await getCurrentUser();
      setUser(toDemoUser(currentUser));
      return data.access;
    } catch {
      clearAuth();
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, [toDemoUser]);

  useEffect(() => {
    // If a JWT exists, the source of truth is the backend user (not any stale demo-user localStorage).
    if (!accessToken || isDemoSession()) return;
    clearDemoUser();
    if (user && user.email?.endsWith('@illinois.edu')) return;
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(toDemoUser(currentUser));
      } catch {
        // If token is stale, let API interceptor/refresh flow handle it later.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user || accessToken),
      isDemo: isDemoSession(),
      isLoading,
      hasCompletedOnboarding: user?.hasCompletedOnboarding ?? null,
      loginDemo: () => {
        const demoUser = startDemoSession();
        setUser(demoUser);
        setAccessToken(getAccessToken());
        return demoUser;
      },
      startDemoSession: () => {
        const demoUser = startDemoSession();
        setUser(demoUser);
        setAccessToken(getAccessToken());
        return demoUser;
      },
      loginGoogleIdToken: loginGoogle,
      loginWithGoogleIdToken: loginGoogle,
      loginLocalApiDemoUser,
      refreshSession,
      logout: () => {
        clearSession();
        setUser(null);
        setAccessToken(null);
      },
    }),
    [accessToken, isLoading, loginGoogle, loginLocalApiDemoUser, refreshSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return value;
}

export function resetAuthForTests() {
  clearAuth();
}
