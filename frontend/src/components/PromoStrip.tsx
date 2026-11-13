import { ArrowUpRight, BadgePercent, Compass, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "../i18n";

export function PromoStrip() {
  const { t } = useTranslation();

  return (
    <section aria-label={t("Marketplace highlights")} className="grid gap-3 md:grid-cols-3">
      <a className="group relative overflow-hidden rounded-xl border border-yellow-200/10 bg-[linear-gradient(115deg,#332356,#211b3c_70%)] p-4 transition hover:border-yellow-200/25" href="#best-sellers">
        <span aria-hidden="true" className="absolute -right-4 -top-8 size-28 rounded-full bg-yellow-400/10 blur-2xl transition group-hover:bg-yellow-300/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-yellow-300/15 text-yellow-200"><Sparkles size={19} /></span>
            <div>
              <p className="text-sm font-bold text-white">{t("Trending with players")}</p>
              <p className="mt-1 text-xs text-[#c2bbd4]">{t("See what everyone is playing")}</p>
            </div>
          </div>
          <ArrowUpRight aria-hidden="true" className="shrink-0 text-yellow-200" size={17} />
        </div>
      </a>
      <a className="group relative overflow-hidden rounded-xl border border-yellow-200/10 bg-[linear-gradient(115deg,#3b2852,#291b3a_72%)] p-4 transition hover:border-yellow-200/25" href="#deals">
        <span aria-hidden="true" className="absolute -right-4 -top-8 size-28 rounded-full bg-yellow-400/10 blur-2xl transition group-hover:bg-yellow-300/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-yellow-300/15 text-yellow-200"><BadgePercent size={19} /></span>
            <div>
              <p className="text-sm font-bold text-white">{t("Offers worth a look")}</p>
              <p className="mt-1 text-xs text-[#d3b9cd]">{t("Compare deals from sellers")}</p>
            </div>
          </div>
          <ArrowUpRight aria-hidden="true" className="shrink-0 text-yellow-200" size={17} />
        </div>
      </a>
      <Link className="group relative overflow-hidden rounded-xl border border-yellow-200/10 bg-[linear-gradient(115deg,#292755,#1b203d_72%)] p-4 transition hover:border-yellow-200/25" to="/catalogue">
        <span aria-hidden="true" className="absolute -right-4 -top-8 size-28 rounded-full bg-yellow-400/10 blur-2xl transition group-hover:bg-yellow-300/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-yellow-300/15 text-yellow-200"><Compass size={19} /></span>
            <div>
              <p className="text-sm font-bold text-white">{t("Find your next game")}</p>
              <p className="mt-1 text-xs text-[#b8c5d1]">{t("Explore the catalogue")}</p>
            </div>
          </div>
          <ArrowUpRight aria-hidden="true" className="shrink-0 text-yellow-200" size={17} />
        </div>
      </Link>
    </section>
  );
}
