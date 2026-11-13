import type { DealItem, HomepageSection } from "../api/types";
import { ProductCard } from "./ProductCard";
import { ProductSection } from "./ProductSection";
import { ProductRail } from "./ProductRail";
import { useTranslation } from "../i18n";

interface DealsSectionProps {
  section?: HomepageSection;
}

export function DealsSection({ section }: DealsSectionProps) {
  const { t } = useTranslation();
  const items = (section?.items ?? []) as DealItem[];

  return (
    <ProductSection
      id="deals"
      subtitle={t("Great games, compelling offers")}
      title={section?.title ?? t("Deals worth a look")}
    >
      {items.length > 0 ? (
        <ProductRail label="deals">
          {items.map(({ product, offer }) => (
            <div className="w-[calc(50%-6px)] shrink-0 snap-start sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]" key={offer.id}>
              <ProductCard
                badge={t("Deal")}
                currency={offer.currency}
                compareAtPrice={offer.compare_at_price}
                price={offer.price}
                platform={offer.platform?.name}
                region={offer.region?.name}
                product={product}
                showDescription
              />
            </div>
          ))}
        </ProductRail>
      ) : (
        <div className="border border-dashed border-white/25 bg-white/[0.04] px-5 py-5 text-center">
          <p className="text-sm font-medium text-white/90">{t("New deals will show up here when sellers list them.")}</p>
          <p className="mt-1 text-xs text-white/65">{t("Only current offers from active sellers are displayed.")}</p>
        </div>
      )}
    </ProductSection>
  );
}
