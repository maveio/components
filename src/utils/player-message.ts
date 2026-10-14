import { templates as de } from '../generated/locales/de';
import { templates as en } from '../generated/locales/en';
import { templates as fr } from '../generated/locales/fr';
import { templates as nl } from '../generated/locales/nl';

const locales: Record<string, Record<string, unknown>> = { de, en, fr, nl };

/** Explicit player locales must not depend on another player's global Lit locale. */
export function playerMessage(fallback: string, id: string, locale?: string): string {
  const value = locales[locale?.toLowerCase().split('-')[0] ?? '']?.[id];
  return typeof value === 'string' ? value : fallback;
}
