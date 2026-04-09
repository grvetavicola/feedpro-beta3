import React, { createContext, useState, useContext, useMemo, useCallback } from 'react';
import { translations } from './translations';

export type Language = 'es' | 'en' | 'pt' | 'ru';

interface LangContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LangContext = createContext<LangContextType | undefined>(undefined);

const getNestedTranslation = (language: Language, key: string): string => {
  const langTranslations = translations[language];
  if (!langTranslations) return key;

  return key.split('.').reduce((obj, k) => {
    if (obj && typeof obj === 'object' && k in obj) {
      return (obj as any)[k];
    }
    return undefined;
  }, langTranslations) || key;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('formula360_lang');
    return (savedLang && ['es', 'en', 'pt', 'ru'].includes(savedLang)) ? (savedLang as Language) : 'es';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('formula360_lang', lang);
  };

  const t = useCallback((key: string, replacements?: { [key: string]: string | number }): string => {
    let translation = getNestedTranslation(language, key);
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translation = translation.replace(`{{${placeholder}}}`, String(replacements[placeholder]));
      });
    }
    return translation;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, t]);

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );
};

export const useTranslations = (): LangContextType => {
  const context = useContext(LangContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a LanguageProvider');
  }
  return context;
};
