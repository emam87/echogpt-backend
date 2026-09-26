export function maskApiKey(apiKey?: string | null): string {
  if (!apiKey || apiKey.length === 0) {
    return '****';
  }
  const last4 = apiKey.slice(-4);
  return `****${last4}`;
}
