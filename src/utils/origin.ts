export const potentialDistFolder = () => {
  if (!document) return '';
  const host = new URL(import.meta.url).host;
  if (['cdn.jsdelivr.net', 'cdn.mave.io', 'cdn.video-dns.com'].includes(host)) {
    return 'dist/';
  }
  return '';
};
