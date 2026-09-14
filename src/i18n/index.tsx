import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { zh, en, Dict } from './translations';

export type Lang = 'zh' | 'en';

type KeysOf<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? `${K}` | (T[K] extends object ? `${K}.${KeysOf<T[K]>}` : never)
        : never;
    }[keyof T]
  : never;

export type TranslateKey = KeysOf<typeof zh>;

const LANG_STORAGE_KEY = 'handheld_reader_language';

const DICTS: Record<Lang, Dict> = { zh, en };

function resolvePath(obj: any, path: string): string | undefined {
  let cur = obj;
  for (const part of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

interface I18nContextValue {
  lang: Lang;
  dict: Dict;
  setLang: (lang: Lang) => void;
  t: (key: TranslateKey) => string;
  tf: (key: TranslateKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function loadInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
  } catch {
    /* ignore */
  }
  return 'zh';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(loadInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
    // Reflect the language on <html lang>
    document.documentElement?.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTS[lang];
    const t = (key: TranslateKey) => resolvePath(dict, key as string) ?? (key as string);
    const tf = (key: TranslateKey, vars?: Record<string, string | number>) => {
      let out = resolvePath(dict, key as string) ?? (key as string);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.split(`{${k}}`).join(String(v));
        }
      }
      return out;
    };
    return { lang, dict, setLang, t, tf };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
