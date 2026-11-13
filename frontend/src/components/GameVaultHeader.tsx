import { Gamepad2, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import type { Category, Platform } from "../api/types";
import { useTranslation } from "../i18n";
import { AccountControls } from "./AccountControls";
import { CartLink } from "./CartLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LoadingSpinner } from "./LoadingSpinner";
import { MarketplaceSearch } from "./MarketplaceSearch";

interface GameVaultHeaderProps {
  categories: Category[];
  platforms: Platform[];
  categoriesLoading: boolean;
  categoriesError: boolean;
}

export function GameVaultHeader({ categories, platforms, categoriesLoading, categoriesError }: GameVaultHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="relative z-50 border-b border-white/10 bg-[#4a0bab]">
      <div className="mx-auto grid max-w-[1000px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 sm:h-[74px] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5 sm:py-0">
        <Link aria-label={t("GameVault home")} className="flex min-w-0 items-center gap-2" to="/">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-yellow-300 to-yellow-100 text-[#32106c] sm:size-10">
            <Gamepad2 size={22} strokeWidth={2.2} />
          </span>
          <span className="truncate text-base font-extrabold tracking-tight text-white">
            Game<span className="text-yellow-200">Vault</span>
          </span>
        </Link>

        <MarketplaceSearch className="col-span-2 row-start-2 sm:col-span-1 sm:row-auto" />

        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-1 sm:col-start-3 sm:row-auto sm:gap-1">
          <CartLink />
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <AccountControls />
        </div>
      </div>

      <nav aria-label={t("Marketplace navigation")} className="border-t border-white/10 bg-[#350879]">
        <div className="mx-auto flex min-h-[42px] max-w-[1280px] items-center gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:h-auto md:flex-wrap md:overflow-visible md:py-1">
          <Link className="inline-flex shrink-0 items-center gap-2 pr-2 text-xs font-semibold text-white" to="/catalogue">
            <Menu size={17} /> {t("Categories")}
          </Link>
          {categories.length > 0 ? (
            categories.map((category) => (
              <Link
                className="shrink-0 px-2 py-2 text-xs font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                key={category.id}
                to={`/catalogue?category=${encodeURIComponent(category.slug)}`}
              >
                {category.name}
              </Link>
            ))
          ) : (
            <span className="px-2 py-2 text-xs text-white/70">
              {categoriesLoading
                ? <span className="inline-flex items-center gap-2"><LoadingSpinner label={t("Loading categories")} size="sm" />{t("Loading categories")}</span>
                : categoriesError
                  ? t("Categories unavailable")
                  : t("Explore the marketplace")}
            </span>
          )}
          {platforms.length > 0 && <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-white/10" />}
          {platforms.map((platform) => (
            <Link
              className="shrink-0 px-2 py-2 text-xs font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
              key={platform.id}
              to={`/catalogue?platform=${encodeURIComponent(platform.slug)}`}
            >
              {platform.name}
            </Link>
          ))}
          <div className="ml-auto sm:hidden"><LanguageSwitcher /></div>
        </div>
      </nav>
    </header>
  );
}
