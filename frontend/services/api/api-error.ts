export type ApiErrorKind = 'network' | 'timeout' | 'server' | 'unauthorized' | 'http' | 'cancelled';
export type ApiError = Error & {
  isApiError: true;
  kind?: ApiErrorKind;
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  issues?: Record<string, string[]>;
};

export function createApiError(message: string, metadata: {
  kind?: ApiErrorKind;
  status?: number;
  code?: string;
  retryAfterSeconds?: number;
  issues?: Record<string, string[]>;
} = {}): ApiError {
  return Object.assign(new Error(message), { isApiError: true as const }, metadata);
}

export function parseFieldIssues(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).flatMap(([key, messages]) => {
    if (!Array.isArray(messages)) return [];
    const valid = messages.filter((message): message is string => typeof message === 'string' && !!message.trim());
    return valid.length ? [[key, valid] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'isApiError' in error && error.isApiError === true;
}

export function isConfirmedSessionFailure(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 401;
}

export type SessionFailure = {
  requiresLogin: boolean;
  reason: 'refresh_invalid' | 'refresh_expired' | 'refresh_revoked'
    | 'refresh_network_error' | 'refresh_timeout' | 'refresh_server_error';
  kind?: ApiErrorKind;
};

export function classifySessionFailure(error: unknown): SessionFailure {
  if (isConfirmedSessionFailure(error)) {
    const reason = error.code === 'SESSION_REVOKED' ? 'refresh_revoked'
      : error.code === 'REFRESH_EXPIRED' ? 'refresh_expired' : 'refresh_invalid';
    return { requiresLogin: true, reason };
  }
  const kind = isApiError(error) ? error.kind : undefined;
  return {
    requiresLogin: false,
    reason: kind === 'timeout' ? 'refresh_timeout'
      : kind === 'server' ? 'refresh_server_error' : 'refresh_network_error',
    kind,
  };
}
