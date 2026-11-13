import type { BestSellerItem, HomepageSection } from "../api/types";
import { ProductCard } from "./ProductCard";
import { ProductSection } from "./ProductSection";
import { ProductRail } from "./ProductRail";
import { useTranslation } from "../i18n";

interface BestSellersSectionProps {
  section?: HomepageSection;
}

export function BestSellersSection({ section }: BestSellersSectionProps) {
  const { t } = useTranslation();
  const items = (section?.items ?? []) as BestSellerItem[];

  return (
    <ProductSection
      id="best-sellers"
      subtitle={t("Popular with players right now")}
      title={section?.title ?? t("Best sellers")}
    >
      {items.length > 0 ? (
        <ProductRail label="best sellers">
          {items.map(({ product, units_sold }) => (
            <div className="w-[calc(50%-6px)] shrink-0 snap-start sm:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)]" key={product.id}>
              <ProductCard badge={units_sold > 0 ? t("Best seller") : undefined} product={product} />
            </div>
          ))}
        </ProductRail>
      ) : (
        <div className="border border-dashed border-white/25 bg-white/[0.04] px-5 py-5 text-center">
          <p className="text-sm font-medium text-white/90">{t("Best sellers will appear here as games are purchased.")}</p>
          <p className="mt-1 text-xs text-white/65">{t("This section is updated from recent marketplace orders.")}</p>
        </div>
      )}
    </ProductSection>
  );
}
