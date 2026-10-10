function validateProductionApiUrl(value) {
  if (!value || !value.trim()) throw new Error('Production EXPO_PUBLIC_API_URL is required for sign-in.');
  let url;
  try { url = new URL(value); }
  catch { throw new Error('Production EXPO_PUBLIC_API_URL must be a public HTTPS URL.'); }
  const host = url.hostname.toLowerCase();
  const localHost = !host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost');
  const ipAddress = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':');
  const placeholder = /(^|\.)(example\.(com|org|net)|invalid|test)$/.test(host);
  if (url.protocol !== 'https:' || localHost || ipAddress || placeholder || url.username || url.password || url.search || url.hash) {
    throw new Error('Production EXPO_PUBLIC_API_URL must use a public HTTPS hostname without credentials, query or fragment.');
  }
}

module.exports = { validateProductionApiUrl };
