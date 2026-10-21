/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAuth, type SessionUser } from '../lib/auth';
import { confirmEmailCode, getCurrentUser, loginWithGoogleIdToken, logoutServer, startDemoSession } from '../lib/authApi';
import type { User } from '../types/api';

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean | null;
  loginDemo: (account?: 'staff') => Promise<SessionUser>;
  loginWithGoogleIdToken: (token: string) => Promise<SessionUser>;
  confirmEmailCode: (code: string) => Promise<SessionUser>;
  refreshSession: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const mapUser = (user: User): SessionUser => ({id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, hasCompletedOnboarding: user.has_completed_onboarding, isStudentVerified: user.is_student_verified, isStaff: Boolean(user.is_staff)});
export function AuthProvider({children}: {children: ReactNode}) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const replaceUser = useCallback(async (next: SessionUser | null) => {
    await queryClient.cancelQueries();
    queryClient.clear();
    setUser(next);
    return next;
  }, [queryClient]);
  const refreshSession = useCallback(async () => {
    try {return await replaceUser(mapUser(await getCurrentUser()));}
    catch {clearAuth(); return replaceUser(null);}
  }, [replaceUser]);
  useEffect(() => {
    let active = true;
    clearAuth();
    getCurrentUser().then((next) => {if (active) setUser(mapUser(next));}).catch(() => {if (active) setUser(null);}).finally(() => {if (active) setIsLoading(false);});
    const expire = () => {clearAuth(); void replaceUser(null);};
    window.addEventListener('skillshare:session-expired', expire);
    return () => {active = false; window.removeEventListener('skillshare:session-expired', expire);};
  }, [replaceUser]);
  const value = useMemo<AuthContextValue>(() => ({
    user, isAuthenticated: Boolean(user), isLoading, hasCompletedOnboarding: user?.hasCompletedOnboarding ?? null,
    loginDemo: async (account) => {const next = mapUser(await startDemoSession(account)); await replaceUser(next); return next;},
    loginWithGoogleIdToken: async (token) => {const next = mapUser((await loginWithGoogleIdToken(token)).user); await replaceUser(next); return next;},
    confirmEmailCode: async (code) => {const next = mapUser(await confirmEmailCode(code)); await replaceUser(next); return next;},
    refreshSession,
    logout: async () => {
      await logoutServer();
      clearAuth(); await replaceUser(null);
    },
  }), [user, isLoading, replaceUser, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider.'); return value;}
export function resetAuthForTests() {clearAuth();}
