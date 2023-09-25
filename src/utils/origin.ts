export const potentialDistFolder = () => {
  if (!document) return '';
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript && new URL(currentScript.src).host.includes('jsdelivr.net')) {
    return 'dist/';
  }
  return '';
};
