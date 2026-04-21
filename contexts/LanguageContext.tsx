import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { translations, Language, TranslationKey } from '@/constants/i18n';
import { CountryConfig, COUNTRIES, getCountryByCode } from '@/constants/countries';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
  isRTL: boolean;
  country: CountryConfig;
  setCountry: (code: string) => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');
  const [country, setCountryState] = useState<CountryConfig>(COUNTRIES[0]);

  useEffect(() => {
    AsyncStorage.multiGet(['app_language', 'app_country']).then(results => {
      const lang = results[0][1] as Language | null;
      const countryCode = results[1][1];
      if (lang && ['fr', 'ar', 'en'].includes(lang)) {
        setLanguageState(lang);
        if (lang === 'ar') I18nManager.allowRTL(true);
      }
      if (countryCode) {
        setCountryState(getCountryByCode(countryCode));
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem('app_language', lang);
    I18nManager.allowRTL(lang === 'ar');
  };

  const setCountry = (code: string) => {
    const c = getCountryByCode(code);
    setCountryState(c);
    AsyncStorage.setItem('app_country', code);
    // Auto-set language based on country default
    if (c.language && c.language !== language) {
      setLanguage(c.language);
    }
  };

  const t = (key: TranslationKey | string): string => {
    const dict = translations[language] as Record<string, any>;
    const val = dict[key];
    if (Array.isArray(val)) return val.join(',');
    return val || (translations.fr as Record<string, any>)[key] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, country, setCountry }}>
      {children}
    </LanguageContext.Provider>
  );
}
