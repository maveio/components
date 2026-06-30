export function potentialDistFolder(): string | null {
  if (typeof document === 'undefined') return null;

  const pathname = new URL(import.meta.url).pathname;

  if (pathname.includes('+esm')) {
    return 'dist/';
  }

  if (pathname.includes('/npm/@maveio/components') && pathname.includes('/dist/')) {
    return './';
  }

  return null;
}
