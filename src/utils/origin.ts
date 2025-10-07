export function potentialDistFolder(): string {
  if (typeof document === 'undefined') return '';
  const pathname = new URL(import.meta.url).pathname;
  if (pathname.includes('+esm')) {
    return 'dist/';
  }
  return '';
}
