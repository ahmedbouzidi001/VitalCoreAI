import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Language, translations, TranslationKey } from '@/constants/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  const isRTL = language === 'ar';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    const val = (translations[language] as any)[key];
    if (Array.isArray(val)) return val.join(',');
    return val || (translations.fr as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export { LanguageContext };
