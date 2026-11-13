import { useTranslation } from "../i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div aria-label={t("Language")} className={`inline-flex shrink-0 items-center rounded-sm border border-white/15 bg-white/[0.04] p-0.5 ${className}`} role="group">
      <button
        aria-label={t("English")}
        aria-pressed={language === "en"}
        className={`min-h-7 min-w-8 rounded-sm px-1.5 text-2xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-200 ${
          language === "en" ? "bg-yellow-300 text-[#24103f]" : "text-white/75 hover:text-white"
        }`}
        onClick={() => setLanguage("en")}
        type="button"
      >
        EN
      </button>
      <button
        aria-label={t("Lithuanian")}
        aria-pressed={language === "lt"}
        className={`min-h-7 min-w-8 rounded-sm px-1.5 text-2xs font-extrabold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-200 ${
          language === "lt" ? "bg-yellow-300 text-[#24103f]" : "text-white/75 hover:text-white"
        }`}
        onClick={() => setLanguage("lt")}
        type="button"
      >
        LT
      </button>
    </div>
  );
}
