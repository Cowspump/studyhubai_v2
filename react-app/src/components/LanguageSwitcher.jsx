import { useLang } from '../context/LanguageContext';

const langs = [
  { code: 'kaz', label: 'ҚАЗ' },
  { code: 'rus', label: 'РУС' },
  { code: 'eng', label: 'ENG' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { lang, changeLang } = useLang();

  return (
    <div className={`lang-switcher ${className}`}>
      {langs.map((l) => (
        <button
          key={l.code}
          className={`lang-btn ${lang === l.code ? 'active' : ''}`}
          onClick={() => changeLang(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
