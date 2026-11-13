import { Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AccountControls } from "./AccountControls";
import { CartLink } from "./CartLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MarketplaceSearch } from "./MarketplaceSearch";
import { useTranslation } from "../i18n";

export function AccountPageHeader() {
  const { t } = useTranslation();

  return (
    <header className="border-b border-white/10 bg-[#4a0bab]">
      <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:min-h-[68px] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5 sm:px-6 sm:py-0">
        <Link aria-label={t("GameVault home")} className="flex min-w-0 items-center gap-2 font-extrabold tracking-tight" to="/">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-yellow-200 to-yellow-400 text-[#32106c]">
            <Gamepad2 size={21} />
          </span>
          <span className="truncate">Game<span className="text-yellow-200">Vault</span></span>
        </Link>
        <MarketplaceSearch className="col-span-2 row-start-2 sm:col-span-1 sm:row-auto" />
        <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-3 sm:row-auto">
          <CartLink />
          <AccountControls />
          <div className="hidden sm:block"><LanguageSwitcher /></div>
        </div>
        <div className="col-span-2 justify-self-end sm:hidden"><LanguageSwitcher /></div>
      </div>
    </header>
  );
}
