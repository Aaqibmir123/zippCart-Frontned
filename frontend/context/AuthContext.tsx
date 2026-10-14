import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, AuthenticatedUser } from '../services/api/auth-api';
import {
  clearRetiredSessions, clearSessionMayExist, getSessionRestoreMode, markSessionMayExist,
} from '../services/auth/session-storage';
import { startupRestoreOutcome } from '../services/auth/auth-startup';
import { classifySessionFailure, createApiError } from '../services/api/api-error';
import { registerAuthSessionHandler, setAuthRestoreInProgress } from '../services/api/client';
import { assertCurrentSession, getSessionScope, setSessionUser, type SessionScope } from '../services/auth/session-scope';
import { sameAuthenticatedUser } from '../services/auth/authenticated-user';

type AuthContextValue = {
  user: AuthenticatedUser | null;
  session: SessionScope | null;
  isRestoringSession: boolean;
  sessionRestoreIssue: boolean;
  isWelcomePending: boolean;
  setUser: (user: AuthenticatedUser | null, showWelcome?: boolean) => void;
  retrySessionRestore: () => void;
  dismissWelcome: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, updateUser] = useState<AuthenticatedUser | null>(null);
  const [session, updateSession] = useState<SessionScope | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionRestoreIssue, setSessionRestoreIssue] = useState(false);
  const [isWelcomePending, setIsWelcomePending] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const currentId = useRef<string | undefined>(undefined);
  const userRef = useRef<AuthenticatedUser | null>(null);
  const modeOverride = useRef<AuthenticatedUser['mode']>(undefined);
  const client = useQueryClient();
  const setUser = useCallback((next: AuthenticatedUser | null, showWelcome = false) => {
    const previousId = currentId.current;
    if (!next || next.id !== previousId || showWelcome) modeOverride.current = undefined;
    else if (next.mode !== userRef.current?.mode) modeOverride.current = next.mode;
    const previousSession = getSessionScope();
    const nextSession = setSessionUser(next?.id ?? null, !!next && showWelcome);
    if (previousSession !== nextSession) client.clear();
    updateSession(next ? nextSession : null);
    currentId.current = next?.id;
    userRef.current = next;
    if (!next) setSessionRestoreIssue(false);
    setIsWelcomePending(!!next && showWelcome);
    if (!next && previousId) console.info('[auth] session_logout');
    updateUser(next);
  }, [client]);
  const dismissWelcome = useCallback(() => setIsWelcomePending(false), []);
  const retrySessionRestore = useCallback(() => {
    console.info('[auth-debug] Try Again pressed; starting another auth restore');
    setAuthRestoreInProgress(true);
    setSessionRestoreIssue(false);
    setIsRestoringSession(true);
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);
  useEffect(() => {
    let active = true;
    async function restore() {
      const originalSession = getSessionScope();
      console.info('[auth-debug] app startup auth restore started');
      setAuthRestoreInProgress(true);
      try {
        const restoreMode = await getSessionRestoreMode();
        await clearRetiredSessions().catch(() => undefined);
        assertCurrentSession(originalSession);
        if (restoreMode === 'none') {
          if (active) {
            setUser(null);
            setSessionRestoreIssue(false);
            console.info('[auth-debug] no possible session; skipping refresh');
          }
          return;
        }

        const response = await authApi.refresh();
        assertCurrentSession(originalSession);
        if (active) {
          await markSessionMayExist().catch(() => console.warn('[auth] session_marker_write_error'));
          assertCurrentSession(originalSession);
          if (!active) return;
          console.info('[auth-debug] startup auth restore succeeded');
          setSessionRestoreIssue(false);
          setUser(modeOverride.current ? { ...response.user, mode: modeOverride.current } : response.user);
          console.info('[auth] session_refresh_success');
        }
      } catch (error) {
        if (!active || originalSession !== getSessionScope()) return;
        const failure = classifySessionFailure(error);
        const outcome = startupRestoreOutcome(false, error);
        const classification = failure.reason === 'refresh_invalid' ? 'invalid'
          : failure.reason === 'refresh_expired' ? 'expired'
            : failure.reason === 'refresh_revoked' ? 'revoked' : 'retryable';
        console.info('[auth-debug] startup auth restore failed:', {
          classification,
          reason: failure.reason,
          kind: failure.kind ?? 'none',
        });
        if (outcome === 'login') {
          await clearSessionMayExist().catch(() => console.warn('[auth] session_marker_clear_error'));
          if (!active || originalSession !== getSessionScope()) return;
          setUser(null);
          setSessionRestoreIssue(false);
        } else {
          setSessionRestoreIssue(true);
        }
      }
      finally {
        setAuthRestoreInProgress(false);
        if (active) setIsRestoringSession(false);
      }
    }
    const unregister = registerAuthSessionHandler({
      hasSession: () => userRef.current !== null,
      refresh: async () => {
        const originalSession = getSessionScope();
        const response = await authApi.refresh();
        assertCurrentSession(originalSession);
        if (!active) throw createApiError('Request cancelled.', { kind: 'cancelled' });
        if (!originalSession.userId || response.user?.id !== originalSession.userId
          || userRef.current?.id !== originalSession.userId) {
          throw createApiError('The server returned an invalid session response. Please try again.', { kind: 'invalid_response' });
        }
        // Refresh updates account data, not login identity, caches, or the welcome flow.
        const next = modeOverride.current ? { ...response.user, mode: modeOverride.current } : response.user;
        if (!sameAuthenticatedUser(userRef.current, next)) {
          userRef.current = next;
          updateUser(next);
        }
        setSessionRestoreIssue(false);
        return response;
      },
      onInvalidSession: () => {
        void clearSessionMayExist().catch(() => console.warn('[auth] session_marker_clear_error'));
        setSessionRestoreIssue(false);
        setUser(null);
      },
      onRecoverableRefreshFailure: () => setSessionRestoreIssue(true),
    });
    void restore();
    return () => { active = false; unregister(); };
  }, [restoreAttempt, setUser]);
  const value = useMemo(() => ({
    user, session, isRestoringSession, sessionRestoreIssue, isWelcomePending, setUser, retrySessionRestore, dismissWelcome,
  }), [user, session, isRestoringSession, sessionRestoreIssue, isWelcomePending, setUser, retrySessionRestore, dismissWelcome]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
