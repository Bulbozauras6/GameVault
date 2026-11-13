import { ArrowRight, Gamepad2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { DealItem, HomepageSection, MarketplaceProduct } from "../api/types";
import { useTranslation } from "../i18n";

interface HeroBannerProps {
  section: HomepageSection;
  deals?: HomepageSection;
}

interface BannerItem {
  product: MarketplaceProduct;
}

function dealImage(item: DealItem | undefined): string | undefined {
  const product = item?.product;
  return product?.images?.find((image) => image.is_primary)?.url ?? product?.images?.[0]?.url;
}

export function HeroBanner({ section, deals }: HeroBannerProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const bannerItem = section?.items[0] as BannerItem | undefined;
  const product = bannerItem?.product;
  const image = product?.images?.find((item) => item.is_primary) ?? product?.images?.[0];
  const dealItems = (deals?.items ?? []) as DealItem[];

  return (
    <section aria-label={t("Featured on GameVault")} className="w-full">
      <div className="grid h-[250px] grid-cols-1 overflow-hidden sm:h-[290px] lg:h-[316px] lg:grid-cols-[minmax(0,2.4fr)_minmax(390px,1fr)]">
        <div className="relative isolate flex min-w-0 items-center overflow-hidden bg-[radial-gradient(ellipse_at_68%_80%,_rgba(246,199,71,0.72),_transparent_44%),linear-gradient(112deg,#321072_0%,#5924a6_52%,#9b6820_100%)]">
          {image && !imageFailed && (
            <img
              alt={image.alt_text ?? product?.title ?? ""}
              className="absolute inset-0 -z-10 size-full object-cover opacity-65 mix-blend-screen"
              onError={() => setImageFailed(true)}
              src={image.url}
            />
          )}
          <div aria-hidden="true" className="absolute -right-20 -top-36 -z-10 size-[500px] rounded-full border border-white/20" />
          <div aria-hidden="true" className="absolute -right-6 -top-20 -z-10 size-[370px] rounded-full border border-white/20" />
          <div className="relative z-10 ml-[max(24px,calc((100vw-1000px)/2))] max-w-[560px] px-4 py-6 sm:ml-[max(40px,calc((100vw-1000px)/2))]">
            <p className="inline-flex items-center gap-2 rounded-sm bg-[#4b0caf]/75 px-2.5 py-1 text-2xs font-bold uppercase tracking-[0.16em] text-white sm:text-xs">
              <Gamepad2 size={14} />
              {section.title}
            </p>
            <h1 className="mt-4 max-w-[520px] text-3xl font-black leading-[1.03] tracking-tight text-white drop-shadow sm:text-4xl lg:text-[50px]">
              {product?.title ?? section.title}
            </h1>
            <p className="mt-2 max-w-md text-sm font-medium leading-5 text-white/90 sm:text-base">
              {t("Discover games and compare offers from the GameVault marketplace.")}
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 rounded-sm bg-yellow-300 px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-[#24103f] shadow-lg transition hover:bg-yellow-200"
              to="/catalogue"
            >
              {t("Explore games")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {dealItems.length > 0 && (
          <div aria-label={t("More marketplace highlights")} className="hidden min-w-0 grid-cols-3 lg:grid">
            {dealItems.slice(0, 3).map((item, index) => {
            const artwork = dealImage(item);

            return (
              <Link
                className={`group relative flex min-w-0 items-end overflow-hidden border-l border-[#4b0caf]/70 ${index === 0 ? "bg-[linear-gradient(160deg,#9f19c7,#371084_75%)]" : index === 1 ? "bg-[linear-gradient(160deg,#7621a5,#201044_75%)]" : "bg-[linear-gradient(160deg,#e15c98,#492080_75%)]"}`}
                to={`/products/${encodeURIComponent(item.product.slug)}`}
                key={item.offer.id}
              >
                {artwork && <img alt={item.product.images?.find((entry) => entry.is_primary)?.alt_text ?? item.product.title} className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" src={artwork} />}
                <span className="absolute inset-0 bg-gradient-to-t from-[#1a063c]/95 via-[#1a063c]/10 to-transparent" />
                <span className="relative z-10 p-3 sm:p-4">
                  <span className="block text-2xs font-extrabold uppercase leading-tight tracking-wide text-yellow-200 sm:text-xs">{t("Marketplace offer")}</span>
                  <span className="mt-1 line-clamp-2 block text-sm font-extrabold leading-tight text-white">{item.product.title}</span>
                  {item.offer.price && item.offer.currency && (
                    <span className="mt-1 block text-xs font-extrabold text-yellow-200">
                      {new Intl.NumberFormat(undefined, { style: "currency", currency: item.offer.currency }).format(Number(item.offer.price))}
                    </span>
                  )}
                </span>
              </Link>
            );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
