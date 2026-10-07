import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import translations from '../i18n/translations';

const LANGUAGE_KEY = '@vehicare_language';

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLang && (savedLang === 'en' || savedLang === 'fil' || savedLang === 'taglish')) {
          setLanguageState(savedLang);
          apiClient.defaults.headers.common['X-User-Language'] = savedLang;
        } else {
          apiClient.defaults.headers.common['X-User-Language'] = 'en';
        }
      } catch (e) {
        console.warn('Failed to load language preference:', e);
      }
    };

    loadLanguage();
  }, []);

  const setLanguage = async (newLang) => {
    if (!['en', 'fil', 'taglish'].includes(newLang)) return;

    try {
      setLanguageState(newLang);
      await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
      apiClient.defaults.headers.common['X-User-Language'] = newLang;
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  };

  const t = (key, fallback = '') => {
    const dict = translations[language] || translations.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    return translations.en[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
