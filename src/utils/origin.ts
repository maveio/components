export function potentialDistFolder(): string {
  if (!document) return '';
  const pathname = new URL(import.meta.url).pathname;
  if (pathname.includes('+esm')) {
    return 'dist/';
  }
  return '';
}
