export const potentialDistFolder = () => {
  if (!document) return '';
  const host = new URL(import.meta.url).host;
  if (['cdn.jsdelivr.net', 'cdn.mave.io'].includes(host)) {
    return 'dist/';
  }
  return '';
};
