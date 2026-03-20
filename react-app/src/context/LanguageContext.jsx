import { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => sessionStorage.getItem('app_lang') || 'kaz');

  const changeLang = (newLang) => {
    setLang(newLang);
    sessionStorage.setItem('app_lang', newLang);
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations['kaz']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
