import type { CuratedItem, HomepageSection } from "../api/types";
import { ProductCard } from "./ProductCard";
import { ProductSection } from "./ProductSection";
import { ProductRail } from "./ProductRail";
import { useTranslation } from "../i18n";

interface CuratedSectionProps {
  section: HomepageSection;
}

export function CuratedSection({ section }: CuratedSectionProps) {
  const { t } = useTranslation();
  const items = section.items as CuratedItem[];

  if (items.length === 0) return null;

  return (
    <ProductSection id={`section-${section.key}`} subtitle={t("Selected from the GameVault catalogue")} title={section.title}>
      <ProductRail label={section.title}>
        {items.map(({ product, offer }) => (
          <div className="w-[calc(50%-6px)] shrink-0 snap-start sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]" key={`${section.key}-${offer?.id ?? product.id}`}>
            <ProductCard
              badge={offer ? t("Featured offer") : undefined}
              compareAtPrice={offer?.compare_at_price}
              currency={offer?.currency ?? product.currency}
              price={offer?.price ?? product.minimum_price}
              platform={offer?.platform?.name}
              region={offer?.region?.name}
              product={product}
              showDescription
            />
          </div>
        ))}
      </ProductRail>
    </ProductSection>
  );
}
