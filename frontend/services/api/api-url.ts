// Only substitute a private IPv4 development host; public APIs remain explicit.
export function resolveApiUrl(configured: string | undefined, hostUri: string | undefined, development: boolean) {
  const value = configured?.trim().replace(/\/+$/, '');
  if (!value || !development || !hostUri) return value;
  try {
    const url = new URL(value);
    const privateHost = (host: string) => /^(10\.|192\.168\.|127\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
    if (privateHost(url.hostname) && privateHost(host)) url.hostname = host;
    return url.toString().replace(/\/+$/, '');
  } catch { return value; }
}
