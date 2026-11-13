import { Gamepad2, Monitor, Smartphone, Tv2 } from "lucide-react";
import type { Platform } from "../api/types";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";
import { LoadingSpinner } from "./LoadingSpinner";

interface PlatformShortcutsProps {
  platforms: Platform[];
  isLoading: boolean;
}

function platformIcon(name: string) {
  const label = name.toLowerCase();

  if (label.includes("playstation") || label.includes("xbox") || label.includes("nintendo")) {
    return <Tv2 aria-hidden="true" size={18} />;
  }

  if (label.includes("mobile") || label.includes("android") || label.includes("ios")) {
    return <Smartphone aria-hidden="true" size={18} />;
  }

  if (label.includes("pc") || label.includes("steam")) {
    return <Monitor aria-hidden="true" size={18} />;
  }

  return <Gamepad2 aria-hidden="true" size={18} />;
}

export function PlatformShortcuts({ platforms, isLoading }: PlatformShortcutsProps) {
  const { t } = useTranslation();

  if (platforms.length === 0) {
    return (
      <nav aria-label={t("Browse by platform")} className="flex min-h-[92px] items-center justify-center border-b border-white/15 py-4">
        <p className="flex items-center gap-2 text-xs text-white/70">
          {isLoading
            ? <><LoadingSpinner label={t("Loading platforms")} size="sm" />{t("Loading platforms")}</>
            : t("Platform shortcuts will appear as the catalogue grows.")}
        </p>
      </nav>
    );
  }

  return (
    <nav aria-label={t("Browse by platform")} className="flex min-h-[92px] items-center justify-center gap-2 overflow-x-auto border-b border-white/15 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:gap-7" id="platforms-heading">
      {platforms.map((platform) => {
        return (
        <Link
          className="group flex min-w-[88px] shrink-0 flex-col items-center justify-center gap-1.5 px-2 py-1 text-center transition hover:-translate-y-0.5"
          key={platform.id}
          to={`/catalogue?platform=${encodeURIComponent(platform.slug)}`}
        >
          <span className="flex min-w-0 flex-col items-center gap-1.5">
            <span className="grid size-9 place-items-center rounded-lg bg-white/[0.07] text-yellow-200">
              {platformIcon(platform.name)}
            </span>
            <span className="max-w-32 whitespace-nowrap text-2xs font-bold leading-tight text-white">{platform.name}</span>
          </span>
        </Link>
        );
      })}
    </nav>
  );
}
