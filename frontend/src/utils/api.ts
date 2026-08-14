/**
 * Dynamic API Base URL resolver.
 * Detects the current hostname (localhost vs Network IP like 192.168.x.x)
 * so that devices on the local network can fetch backend data smoothly.
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
};
