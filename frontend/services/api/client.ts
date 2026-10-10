import { classifySessionFailure, createApiError, isApiError, parseFieldIssues, type ApiErrorKind } from './api-error';
import { TurboModuleRegistry, type TurboModule } from 'react-native';
import { resolveApiUrl } from './api-url';
import { assertCurrentSession, getSessionScope, isCurrentSession, type SessionScope } from '../auth/session-scope';

const development = typeof __DEV__ !== 'undefined' && __DEV__;
interface SourceCodeModule extends TurboModule {
  getConstants(): { scriptURL: string };
}
const sourceCode = development ? TurboModuleRegistry.get<SourceCodeModule>('SourceCode') : null;
const apiUrl = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, sourceCode?.getConstants().scriptURL, development);

type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';
type RequestOptions = {
  body?: object;
  method?: HttpMethod;
  timeoutMs?: number;
  public?: boolean;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
};
type AuthSessionHandler = {
  hasSession: () => boolean;
  refresh: () => Promise<unknown>;
  onInvalidSession: () => void;
  onRecoverableRefreshFailure: (kind: ApiErrorKind) => void;
};
let authSessionHandler: AuthSessionHandler | null = null;
let refreshInFlight: { session: SessionScope; promise: Promise<boolean> } | null = null;
let authRestoreInProgress = true;

export function setAuthRestoreInProgress(inProgress: boolean): void {
  authRestoreInProgress = inProgress;
}

export function registerAuthSessionHandler(handler: AuthSessionHandler): () => void {
  authSessionHandler = handler;
  return () => {
    if (authSessionHandler === handler) authSessionHandler = null;
  };
}

function logAuthEvent(event: string): void {
  console.info(`[auth] ${event}`);
}

function canRefresh(path: string, options: RequestOptions): boolean {
  return !options.public && !options.skipAuthRefresh
    && !path.startsWith('/auth/otp/')
    && path !== '/auth/refresh'
    && path !== '/auth/logout';
}

function refreshSession(session: SessionScope): Promise<boolean> {
  assertCurrentSession(session);
  if (refreshInFlight?.session === session) return refreshInFlight.promise;
  const handler = authSessionHandler;
  if (!handler?.hasSession()) return Promise.resolve(false);

  const promise = handler.refresh().then(() => {
    if (!isCurrentSession(session)) return false;
    logAuthEvent('access_token_refreshed');
    return true;
  }).catch((error: unknown) => {
    if (!isCurrentSession(session)) return false;
    const failure = classifySessionFailure(error);
    logAuthEvent(failure.reason);
    if (failure.requiresLogin) {
      handler.onInvalidSession();
    } else {
      handler.onRecoverableRefreshFailure(failure.kind ?? 'network');
    }
    return false;
  }).finally(() => {
    if (refreshInFlight?.promise === promise) refreshInFlight = null;
  });
  refreshInFlight = { session, promise };
  return promise;
}

function getEndpoint(path: string): string {
  if (!apiUrl) throw createApiError('Sign-in is unavailable. Please check the API configuration.');
  if (development && path === '/auth/otp/request') {
    const hostname = new URL(apiUrl).hostname;
    const isPrivateHost = /^(localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/i.test(hostname);
    if (!isPrivateHost) {
      throw createApiError('Local OTP testing requires the local development backend.', { kind: 'http' });
    }
  }
  if (typeof __DEV__ !== 'undefined' && !__DEV__ && !apiUrl.startsWith('https://')) {
    throw createApiError('Sign-in is unavailable. Please try again later.');
  }
  return `${apiUrl}${path}`;
}

async function sendRequest<T>(path: string, options: RequestOptions, session?: SessionScope): Promise<T> {
  if (session) assertCurrentSession(session);
  const endpoint = getEndpoint(path);
  const isRefreshRequest = path === '/auth/refresh';
  if (isRefreshRequest && development) console.info('[auth-debug] refresh request started');
  if (development && authRestoreInProgress
    && /^\/(profile|cart|favorites|products)(\/|$|\?)/.test(path)) {
    console.info('[auth-debug] application data request started before auth restore finished:', options.method ?? 'POST', path.split('?')[0]);
  }
  const isLocationDebugRequest = development && path === '/location/reverse-geocode';
  if (isLocationDebugRequest) {
    const safeEndpoint = new URL(endpoint);
    safeEndpoint.search = '';
    safeEndpoint.hash = '';
    console.info('[location-debug] resolved backend request URL:', `${options.method ?? 'POST'} ${safeEndpoint.toString()}`);
  }
  let response: Response;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 10000);
  const cancel = () => controller.abort();
  options.signal?.addEventListener('abort', cancel, { once: true });
  session?.signal.addEventListener('abort', cancel, { once: true });
  if (options.signal?.aborted) cancel();

  try {
    response = await fetch(endpoint, {
      method: options.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: options.public ? 'omit' : 'include',
      signal: controller.signal,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (isRefreshRequest && development) console.info('[auth-debug] refresh HTTP status:', response.status);
    if (isLocationDebugRequest) {
      console.info('[location-debug] backend HTTP response status:', String(response.status));
    }
    if (response.status === 204) return undefined as T;
    if (response.ok) return await response.json() as T;
    const parsed: unknown = await response.json().catch(() => ({ message: 'Request failed.' }));
    const data = parsed && typeof parsed === 'object'
      ? parsed as { message?: string; code?: string; issues?: unknown }
      : { message: 'Request failed.' };
    if (isRefreshRequest && development) {
      console.info('[auth-debug] refresh response error:', {
        status: response.status,
        code: data.code ?? 'none',
        classification: data.code === 'REFRESH_EXPIRED' ? 'expired'
          : data.code === 'SESSION_REVOKED' ? 'revoked'
            : data.code === 'REFRESH_INVALID' ? 'invalid'
              : response.status >= 500 ? 'server_error' : 'http_error',
      });
    }
    const retryAfter = Number(response.headers.get('Retry-After'));
    const kind: ApiErrorKind = response.status === 401 ? 'unauthorized'
      : response.status >= 500 ? 'server' : 'http';
    throw createApiError(data.message ?? 'Request failed.', { kind, status: response.status,
      issues: parseFieldIssues(data.issues),
      code: typeof data.code === 'string' ? data.code : undefined,
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined });
  } catch (error) {
    if (isApiError(error)) throw error;
    if (isRefreshRequest && development) {
      console.info('[auth-debug] refresh transport failure:', {
        kind: timedOut ? 'timeout' : 'network',
        errorName: error instanceof Error ? error.name : 'unknown',
      });
    }
    throw createApiError(timedOut ? 'The request timed out. Please try again.' : 'Could not connect. Check your connection and try again.',
      { kind: timedOut ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
    session?.signal.removeEventListener('abort', cancel);
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = options.public ? undefined : getSessionScope();
  try {
    const result = await sendRequest<T>(path, options, session);
    if (session) assertCurrentSession(session);
    return result;
  } catch (error) {
    if (session) assertCurrentSession(session);
    if (!isApiError(error) || error.status !== 401 || !canRefresh(path, options)) throw error;
    if (!session) throw error;
    const refreshed = await refreshSession(session);
    assertCurrentSession(session);
    if (!refreshed) throw error;
    const result = await sendRequest<T>(path, { ...options, skipAuthRefresh: true }, session);
    assertCurrentSession(session);
    return result;
  }
}
