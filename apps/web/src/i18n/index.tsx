import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import fr from './fr.json';
import en from './en.json';
import { desktop } from '../backend';

export type Language = 'fr' | 'en';
type Params = Record<string, string | number>;
const dictionaries: Record<Language, unknown> = { fr, en };
const get = (dictionary: unknown, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>((current, part) => current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined, dictionary);
  return typeof value === 'string' ? value : undefined;
};
export function translate(key: string, language: Language = 'fr', params: Params = {}): string {
  return (get(dictionaries[language], key) ?? get(fr, key) ?? key).replace(/\{(\w+)\}/g, (whole, name: string) => String(params[name] ?? whole));
}
function storedLanguage(): Language {
  const requested = new URLSearchParams(location.search).get('lang');
  if (requested === 'fr' || requested === 'en') return requested;
  if (desktop?.locale === 'fr' || desktop?.locale === 'en') return desktop.locale;
  try { return localStorage.getItem('vrille-language') === 'en' ? 'en' : 'fr'; } catch { return 'fr'; }
}
const Context = createContext<{ language: Language; setLanguage: (language: Language) => void; t: (key: string, params?: Params) => string } | null>(null);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(storedLanguage);
  document.documentElement.lang = language;
  const setLanguage = useCallback((next: Language) => { document.documentElement.lang = next; updateLanguage(next); }, []);
  useEffect(() => { document.documentElement.lang = language; try { localStorage.setItem('vrille-language', language); } catch { /* Preferences remain optional. */ } void desktop?.setLanguage?.(language).catch(() => {}); }, [language]);
  const t = useCallback((key: string, params?: Params) => translate(key, language, params), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  const context = useContext(Context);
  if (!context) throw new Error('I18nProvider is required.');
  return context;
}
export function LanguageSelect({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  return <label className={`language-select ${className}`}><span aria-hidden>🌐</span><span className="sr-only">{t('menu.language')}</span><select aria-label={t('menu.language')} value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="fr">Français</option><option value="en">English</option></select></label>;
}
