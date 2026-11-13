import { Gamepad2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MarketplaceSearch } from "./MarketplaceSearch";

interface AuthLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_18%_8%,_rgba(246,199,71,0.12),_transparent_34%),radial-gradient(ellipse_at_50%_0%,_rgba(127,61,232,0.38),_transparent_48%),#4b0caf] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1080px]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5">
          <Link aria-label={t("GameVault home")} className="flex items-center gap-2 font-extrabold tracking-tight" to="/">
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-yellow-200 to-yellow-400 text-[#32106c]">
              <Gamepad2 size={21} />
            </span>
            <span className="text-lg">Game<span className="text-yellow-200">Vault</span></span>
          </Link>
          <MarketplaceSearch className="col-span-2 row-start-2 sm:col-span-1 sm:row-auto" />
          <div className="col-start-2 row-start-1 sm:col-start-3 sm:row-auto"><LanguageSwitcher /></div>
        </header>

        <div className="grid items-center gap-7 py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-14 lg:py-14">
          <section aria-labelledby="auth-promo-title" className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-yellow-200/20 bg-yellow-200/[0.08] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-yellow-100">
              <Sparkles aria-hidden="true" size={14} />
              {t("GameVault marketplace")}
            </p>
            <h1 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl" id="auth-promo-title">
              {t("Your next adventure starts here.")}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/75 sm:text-base">
              {t("Discover games. Find better deals.")}
            </p>
            <p className="mt-2 hidden max-w-lg text-sm leading-6 text-white/65 sm:block">
              {t("Compare marketplace offers and find the right game for your next session.")}
            </p>
          </section>

          <section className="border border-white/15 bg-[#351078]/95 p-5 shadow-2xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-200">{t("GameVault account")}</p>
            <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-5 text-white/70">{description}</p>
            <div className="mt-6">{children}</div>
            <div className="mt-6 border-t border-white/15 pt-5 text-center text-sm text-white/75">{footer}</div>
          </section>
        </div>

        <p className="pb-2 text-center text-xs text-white/55">
          <Link className="transition hover:text-yellow-100" to="/">{t("Return to the marketplace")}</Link>
        </p>
      </div>
    </main>
  );
}
