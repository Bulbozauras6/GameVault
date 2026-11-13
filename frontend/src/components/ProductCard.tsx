import { Gamepad2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { MarketplaceProduct } from "../api/types";
import { useTranslation } from "../i18n";

interface ProductCardProps {
  product: MarketplaceProduct;
  badge?: string;
  currency?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  platform?: string | null;
  region?: string | null;
  showDescription?: boolean;
}

export function ProductCard({ product, badge, currency, price, compareAtPrice, platform, region, showDescription = false }: ProductCardProps) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const image = product.images?.find((item) => item.is_primary) ?? product.images?.[0];
  const displayPrice = price ?? product.minimum_price;
  const displayCurrency = currency ?? product.currency;
  const formattedPrice = displayPrice
    && displayCurrency
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: displayCurrency }).format(Number(displayPrice))
    : null;
  const formattedCompareAtPrice = compareAtPrice && displayCurrency
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: displayCurrency }).format(Number(compareAtPrice))
    : null;
  const discount = compareAtPrice && displayPrice && Number(compareAtPrice) > Number(displayPrice)
    ? Math.max(0, Math.round((1 - Number(displayPrice) / Number(compareAtPrice)) * 100))
    : 0;
  const platformLabel = platform ?? product.platforms?.[0]?.name;
  const regionLabel = region ?? product.regions?.[0]?.name;

  return (
    <Link
      aria-label={t("View {product}", { product: product.title })}
      className="group block overflow-hidden border border-white/25 bg-[#3e098f] transition duration-200 hover:border-white/60"
      to={`/products/${encodeURIComponent(product.slug)}`}
    >
      <div className="relative aspect-[1.12/1] overflow-hidden bg-[radial-gradient(ellipse_at_70%_20%,_rgba(203,173,255,0.24),_transparent_45%),#321072]">
        {image && !imageFailed ? (
          <img
            alt={image.alt_text ?? product.title}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={image.url}
          />
        ) : (
          <div aria-hidden="true" className="grid size-full place-items-center text-yellow-200/50">
            <Gamepad2 size={46} strokeWidth={1.2} />
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 max-w-[75%] truncate rounded-sm bg-yellow-300 px-2 py-1 text-2xs font-extrabold uppercase tracking-wide text-[#24103f]">
            {t(badge)}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute bottom-2 left-2 rounded-sm bg-pink-400 px-2 py-1 text-2xs font-extrabold text-[#241022]">
            -{discount}%
          </span>
        )}
      </div>

      <div className="p-2.5">
        <h3 className="line-clamp-2 min-h-9 text-xs font-semibold leading-[1.15rem] text-[#f0edf8] sm:text-sm">{product.title}</h3>
        {showDescription && product.short_description && (
          <p className="mt-1 line-clamp-2 min-h-8 text-2xs leading-4 text-white/70">{product.short_description}</p>
        )}
        {(platformLabel || regionLabel) && (
          <div className="mt-1 flex min-h-5 flex-wrap gap-1">
            {platformLabel && <span className="max-w-full truncate rounded bg-white/[0.10] px-1.5 py-0.5 text-2xs font-semibold text-white/85">{platformLabel}</span>}
            {regionLabel && <span className="max-w-full truncate rounded bg-white/[0.10] px-1.5 py-0.5 text-2xs font-semibold text-white/85">{regionLabel}</span>}
          </div>
        )}
        <div className="mt-2 flex items-end justify-between gap-1">
          <div>
            <p className="text-2xs font-medium uppercase tracking-wide text-white/65">{t(formattedPrice ? "From" : "Offers")}</p>
            {formattedPrice ? (
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                <p className="text-base font-extrabold tracking-tight text-yellow-200 sm:text-lg">{formattedPrice}</p>
                {formattedCompareAtPrice && (
                  <p className="text-2xs text-white/60 line-through">{formattedCompareAtPrice}</p>
                )}
              </div>
            ) : (
              <p className="mt-0.5 text-sm font-semibold text-white/85">{t("View offers")}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
