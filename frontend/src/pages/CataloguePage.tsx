import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Filter, RotateCcw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchCategories, fetchPlatforms, fetchProductPage, fetchRegions } from "../api/home";
import type { ProductFilters } from "../api/types";
import { GameVaultHeader } from "../components/GameVaultHeader";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ProductCard } from "../components/ProductCard";
import { useTranslation } from "../i18n";

const pageSize = 24;

export function CataloguePage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const platformsQuery = useQuery({ queryKey: ["platforms"], queryFn: fetchPlatforms });
  const regionsQuery = useQuery({ queryKey: ["regions"], queryFn: fetchRegions });

  const category = searchParams.get("category") ?? "";
  const platform = searchParams.get("platform") ?? "";
  const region = searchParams.get("region") ?? "";
  const minPrice = searchParams.get("min_price") ?? "";
  const maxPrice = searchParams.get("max_price") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const sort = searchParams.get("sort") ?? (search ? "relevance" : "newest");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const filters = useMemo<ProductFilters>(() => ({
    category: category || undefined,
    platform: platform || undefined,
    region: region || undefined,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
    search: search || undefined,
    sort,
    page,
    per_page: pageSize,
  }), [category, maxPrice, minPrice, page, platform, region, search, sort]);
  const productsQuery = useQuery({
    queryKey: ["catalogue", filters],
    queryFn: () => fetchProductPage(filters),
  });

  const selectedCategory = categoriesQuery.data?.find((item) => item.slug === category);
  const selectedPlatform = platformsQuery.data?.find((item) => item.slug === platform);
  const selectedRegion = regionsQuery.data?.find((item) => item.code === region);
  const title = search
    ? t("Search results")
    : selectedCategory?.name ?? selectedPlatform?.name ?? selectedRegion?.name ?? t("Game catalogue");
  const products = productsQuery.data?.products ?? [];
  const total = productsQuery.data?.total ?? products.length;
  function updateFilter(key: "category" | "platform" | "region" | "search" | "sort" | "page", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setSearchParams(next);
    setMobileFiltersOpen(false);
  }

  function resetFilters() {
    setSearchParams({});
    setMobileFiltersOpen(false);
  }

  function applyPriceRange(nextMinimum: string, nextMaximum: string) {
    const next = new URLSearchParams(searchParams);
    if (nextMinimum) next.set("min_price", nextMinimum);
    else next.delete("min_price");
    if (nextMaximum) next.set("max_price", nextMaximum);
    else next.delete("max_price");
    next.delete("page");
    setSearchParams(next);
    setMobileFiltersOpen(false);
  }

  const sidebar = (
    <div className="space-y-6">
      <div className="flex items-center justify-between lg:hidden">
        <h2 className="text-lg font-extrabold">{t("Filters")}</h2>
        <button
          aria-label={t("Close filters")}
          className="grid size-9 place-items-center rounded-sm text-white/75 hover:bg-white/10"
          onClick={() => setMobileFiltersOpen(false)}
          type="button"
        >
          <X size={19} />
        </button>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-extrabold">{t("Categories")}</h2>
        {categoriesQuery.isLoading ? (
          <LoadingSpinner centered={false} label={t("Loading catalogue")} size="sm" />
        ) : (
          <ul className="space-y-1">
            <li>
              <button
                aria-current={!category ? "page" : undefined}
                className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${
                  !category ? "bg-yellow-300 font-bold text-[#24103f]" : "text-white/80 hover:bg-white/[0.07] hover:text-white"
                }`}
                onClick={() => updateFilter("category", "")}
                type="button"
              >
                {t("All categories")}
              </button>
            </li>
            {(categoriesQuery.data ?? []).map((item) => (
              <li key={item.id}>
                <button
                  aria-current={category === item.slug ? "page" : undefined}
                  className={`w-full rounded-sm px-3 py-2 text-left text-sm transition ${
                    category === item.slug ? "bg-yellow-300 font-bold text-[#24103f]" : "text-white/80 hover:bg-white/[0.07] hover:text-white"
                  }`}
                  onClick={() => updateFilter("category", item.slug)}
                  type="button"
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <label className="block text-sm font-bold" htmlFor="catalogue-platform">
        {t("Platform")}
        <select
          className="mt-2 h-10 w-full rounded-sm border border-white/15 bg-[#230c5d] px-3 text-sm text-white outline-none focus:border-yellow-200"
          id="catalogue-platform"
          onChange={(event) => updateFilter("platform", event.target.value)}
          value={platform}
        >
          <option value="">{t("All platforms")}</option>
          {(platformsQuery.data ?? []).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold" htmlFor="catalogue-region">
        {t("Region")}
        <select
          className="mt-2 h-10 w-full rounded-sm border border-white/15 bg-[#230c5d] px-3 text-sm text-white outline-none focus:border-yellow-200"
          id="catalogue-region"
          onChange={(event) => updateFilter("region", event.target.value)}
          value={region}
        >
          <option value="">{t("All regions")}</option>
          {(regionsQuery.data ?? []).map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
        </select>
      </label>

      <PriceRangeFilter key={`${minPrice}:${maxPrice}`} minimum={minPrice} maximum={maxPrice} onApply={applyPriceRange} />

      <button
        className="inline-flex items-center gap-2 text-sm font-semibold text-yellow-200 transition hover:text-yellow-100"
        onClick={resetFilters}
        type="button"
      >
        <RotateCcw aria-hidden="true" size={15} />
        {t("Reset filters")}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <GameVaultHeader
        categories={categoriesQuery.data ?? []}
        categoriesError={categoriesQuery.isError}
        categoriesLoading={categoriesQuery.isLoading}
        platforms={platformsQuery.data ?? []}
      />

      {mobileFiltersOpen && (
        <button
          aria-label={t("Close filters")}
          className="fixed inset-0 z-40 cursor-default bg-black/65 lg:hidden"
          onClick={() => setMobileFiltersOpen(false)}
          type="button"
        />
      )}
      <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <button
            aria-expanded={mobileFiltersOpen}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm border border-white/20 px-3 text-sm font-bold hover:bg-white/10"
            onClick={() => setMobileFiltersOpen(true)}
            type="button"
          >
            <Filter size={16} />
            {t("Filters")}
          </button>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside
            aria-label={t("Filter catalogue")}
            className={mobileFiltersOpen
              ? "fixed inset-y-0 left-0 z-50 w-[min(21rem,86vw)] overflow-y-auto border-r border-white/15 bg-[#2b0b68] p-5 shadow-2xl lg:sticky lg:top-4 lg:z-auto lg:h-fit lg:w-full lg:overflow-visible"
              : "hidden border border-white/10 bg-[#350879] p-4 lg:sticky lg:top-4 lg:block lg:h-fit"}
          >
            {sidebar}
          </aside>

          <section aria-labelledby="catalogue-heading" className="min-w-0">
            <div className="flex flex-col gap-4 border-b border-white/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-200">
                  {[selectedCategory?.name, selectedPlatform?.name, selectedRegion?.name].filter(Boolean).join(" · ") || t("Categories")}
                </p>
                <h1 className="mt-1 hidden text-3xl font-extrabold sm:block" id="catalogue-heading">{title}</h1>
                {search && <p className="mt-1 truncate text-sm text-white/70">{t("Results for “{search}”", { search })}</p>}
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm font-semibold" htmlFor="catalogue-sort">
                <span>{t("Sort by")}</span>
                <select
                  className="h-10 max-w-48 rounded-sm border border-white/15 bg-[#230c5d] px-2 text-sm text-white outline-none focus:border-yellow-200"
                  id="catalogue-sort"
                  onChange={(event) => updateFilter("sort", event.target.value)}
                  value={sort}
                >
                  <option value="relevance">{t("Relevance")}</option>
                  <option value="price_asc">{t("Price: low to high")}</option>
                  <option value="price_desc">{t("Price: high to low")}</option>
                  <option value="title_asc">{t("Name: A to Z")}</option>
                  <option value="title_desc">{t("Name: Z to A")}</option>
                  <option value="newest">{t("Newest")}</option>
                </select>
              </label>
            </div>

            {productsQuery.isLoading ? (
              <LoadingSpinner centered label={t("Loading catalogue")} size="lg" />
            ) : productsQuery.isError ? (
              <div className="mt-6 border border-rose-200/20 bg-[#350879] p-5 text-sm text-rose-100" role="alert">
                <p>{t("Could not load catalogue. Please try again.")}</p>
                <button className="mt-3 font-bold underline" onClick={() => void productsQuery.refetch()} type="button">{t("Try again")}</button>
              </div>
            ) : (
              <>
                <p className="mt-4 text-sm text-white/70">{t("Showing {count} games", { count: total })}</p>
                {products.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {products.map((product) => <ProductCard key={product.id} product={product} />)}
                  </div>
                ) : (
                  <div className="mt-6 border border-dashed border-white/20 bg-white/[0.04] px-5 py-10 text-center">
                    <h2 className="text-lg font-bold">{t("No games match these filters.")}</h2>
                    <p className="mt-2 text-sm text-white/65">{t("Try adjusting or clearing your filters.")}</p>
                    <button className="mt-4 rounded-sm bg-yellow-300 px-4 py-2 text-sm font-bold text-[#24103f]" onClick={resetFilters} type="button">
                      {t("Reset filters")}
                    </button>
                  </div>
                )}
                {productsQuery.data && productsQuery.data.lastPage > 1 && (
                  <nav aria-label={t("Catalogue pages")} className="mt-6 flex items-center justify-between gap-3">
                    <button
                      className="inline-flex min-h-10 items-center gap-1 rounded-sm border border-white/20 px-3 text-sm font-semibold disabled:opacity-40"
                      disabled={page <= 1}
                      onClick={() => updateFilter("page", String(page - 1))}
                      type="button"
                    >
                      <ChevronLeft size={17} /> {t("Previous")}
                    </button>
                    <span className="text-sm text-white/70">{t("Page {current} of {total}", { current: page, total: productsQuery.data.lastPage })}</span>
                    <button
                      className="inline-flex min-h-10 items-center gap-1 rounded-sm border border-white/20 px-3 text-sm font-semibold disabled:opacity-40"
                      disabled={page >= productsQuery.data.lastPage}
                      onClick={() => updateFilter("page", String(page + 1))}
                      type="button"
                    >
                      {t("Next")} <ChevronRight size={17} />
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function PriceRangeFilter({
  minimum,
  maximum,
  onApply,
}: {
  minimum: string;
  maximum: string;
  onApply: (minimum: string, maximum: string) => void;
}) {
  const { t } = useTranslation();
  const [minPrice, setMinPrice] = useState(minimum);
  const [maxPrice, setMaxPrice] = useState(maximum);
  const invalidRange = minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice);

  return (
    <section aria-labelledby="catalogue-price-heading">
      <h2 className="mb-2 text-sm font-extrabold" id="catalogue-price-heading">{t("Price range")}</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs font-semibold text-white/75" htmlFor="catalogue-min-price">
          {t("Minimum price")}
          <input
            aria-invalid={invalidRange}
            className="mt-1 h-10 w-full rounded-sm border border-white/15 bg-[#230c5d] px-2 text-sm text-white outline-none focus:border-yellow-200"
            id="catalogue-min-price"
            min="0"
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={minPrice}
          />
        </label>
        <label className="min-w-0 text-xs font-semibold text-white/75" htmlFor="catalogue-max-price">
          {t("Maximum price")}
          <input
            aria-invalid={invalidRange}
            className="mt-1 h-10 w-full rounded-sm border border-white/15 bg-[#230c5d] px-2 text-sm text-white outline-none focus:border-yellow-200"
            id="catalogue-max-price"
            min="0"
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="—"
            step="0.01"
            type="number"
            value={maxPrice}
          />
        </label>
      </div>
      {invalidRange && <p className="mt-2 text-xs text-rose-200" role="alert">{t("Minimum price cannot exceed maximum price.")}</p>}
      <button
        className="mt-3 w-full rounded-sm border border-white/20 px-3 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={invalidRange}
        onClick={() => onApply(minPrice, maxPrice)}
        type="button"
      >
        {t("Apply price range")}
      </button>
    </section>
  );
}
