import { isApiError } from '../../../services/api/api-error';

export function dashboardError(error: unknown): string {
  if (isApiError(error)) {
    if (error.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.status === 403) return 'This account cannot access the admin dashboard.';
    if (error.status === 404) return 'The dashboard service is unavailable. Please contact support.';
    if (error.status === 429) return 'Too many refreshes. Please wait a moment and try again.';
    if (!error.status) return 'Could not connect to the dashboard. Check your connection and try again.';
  }
  return 'The dashboard could not load. Please try again.';
}
