import { useQuery } from "@tanstack/react-query";
import { Gamepad2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProducts } from "../api/home";
import { useTranslation } from "../i18n";
import { LoadingSpinner } from "./LoadingSpinner";

interface MarketplaceSearchProps {
  className?: string;
}

export function MarketplaceSearch({ className = "" }: MarketplaceSearchProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const suggestionsQuery = useQuery({
    queryKey: ["search-suggestions", debouncedSearch],
    queryFn: () => fetchProducts({ search: debouncedSearch, per_page: 6 }),
    enabled: searchOpen && search.trim().length >= 2 && debouncedSearch.length >= 2 && debouncedSearch === search.trim(),
  });
  const suggestions = useMemo(() => suggestionsQuery.data ?? [], [suggestionsQuery.data]);
  const suggestionsLoading = search.trim().length >= 2 && (
    debouncedSearch !== search.trim() || suggestionsQuery.isLoading || suggestionsQuery.isFetching
  );

  useEffect(() => {
    const value = search.trim();
    if (value.length < 2) return;

    const timeoutId = window.setTimeout(() => setDebouncedSearch(value), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (!searchOpen) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
        setActiveIndex(-1);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [searchOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = search.trim();
    setSearchOpen(false);
    setActiveIndex(-1);
    navigate(value ? `/catalogue?search=${encodeURIComponent(value)}` : "/catalogue");
  }

  function openProduct(slug: string) {
    setSearchOpen(false);
    setActiveIndex(-1);
    navigate(`/products/${encodeURIComponent(slug)}`);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" && search.trim().length >= 2 && !suggestionsLoading && suggestions.length > 0) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
    }
    if (event.key === "ArrowUp" && search.trim().length >= 2 && !suggestionsLoading && suggestions.length > 0) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveIndex((current) => current <= 0 ? suggestions.length - 1 : current - 1);
    }
    if (event.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      openProduct(suggestions[activeIndex].slug);
    }
  }

  function clearSearch() {
    setSearch("");
    setDebouncedSearch("");
    setSearchOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function suggestionImage(product: (typeof suggestions)[number]) {
    return product.images?.find((image) => image.is_primary) ?? product.images?.[0];
  }

  return (
    <form
      className={`relative min-w-0 flex-1 ${className}`}
      onSubmit={submitSearch}
      ref={searchRef}
      role="search"
    >
      <label className="sr-only" htmlFor="marketplace-search">{t("Search games")}</label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a19bb6]" size={18} />
      <input
        aria-activedescendant={activeIndex >= 0 ? `search-suggestion-${suggestions[activeIndex]?.id}` : undefined}
        aria-autocomplete="list"
        aria-controls="search-suggestions"
        aria-expanded={searchOpen}
        autoComplete="off"
        className="h-10 w-full rounded-sm border border-white/45 bg-[#351078] pl-10 pr-11 text-sm font-medium text-white outline-none transition placeholder:text-white/65 focus:border-yellow-200 sm:h-12"
        id="marketplace-search"
        onChange={(event) => {
          const value = event.target.value;
          setSearch(value);
          if (value.trim().length < 2) setDebouncedSearch("");
          setSearchOpen(Boolean(value.trim()));
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (search.trim()) setSearchOpen(true);
        }}
        onKeyDown={handleSearchKeyDown}
        placeholder={t("Search games...")}
        ref={inputRef}
        role="combobox"
        type="search"
        value={search}
      />
      {search && (
        <button
          aria-label={t("Clear search")}
          className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          onClick={clearSearch}
          type="button"
        >
          <X size={15} />
        </button>
      )}

      {searchOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] overflow-hidden rounded-sm border border-white/15 bg-[#21143a] p-2 shadow-2xl">
          {search.trim().length < 2 ? (
            <p className="px-3 py-3 text-sm text-white/65">{t("Type at least 2 characters")}</p>
          ) : suggestionsLoading ? (
            <div className="flex items-center gap-3 px-3 py-4 text-sm text-white/70">
              <LoadingSpinner label={t("Searching the catalogue…")} size="sm" />
              {t("Searching the catalogue…")}
            </div>
          ) : suggestionsQuery.isError ? (
            <p className="px-3 py-4 text-sm text-rose-200">{t("Search is unavailable. Please try again.")}</p>
          ) : suggestions.length > 0 ? (
            <ul aria-label={t("Search suggestions")} className="max-h-80 overflow-y-auto" id="search-suggestions" role="listbox">
              {suggestions.map((product, index) => {
                const image = suggestionImage(product);
                return (
                  <li id={`search-suggestion-${product.id}`} key={product.id} role="option" aria-selected={index === activeIndex}>
                    <button
                      className={`flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition ${
                        index === activeIndex ? "bg-white/10" : "hover:bg-white/[0.06]"
                      }`}
                      onClick={() => openProduct(product.slug)}
                      onMouseEnter={() => setActiveIndex(index)}
                      type="button"
                    >
                      <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-sm bg-[#351d56]">
                        {image
                          ? <img alt="" className="size-full object-cover" src={image.url} />
                          : <Gamepad2 aria-hidden="true" className="text-white/50" size={20} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{product.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-white/60">
                          {[product.platforms?.[0]?.name, product.regions?.[0]?.name].filter(Boolean).join(" · ") || t("Available now")}
                        </span>
                      </span>
                      {product.minimum_price && product.currency && (
                        <span className="shrink-0 text-xs font-extrabold text-yellow-200">
                          {new Intl.NumberFormat(language === "lt" ? "lt-LT" : "en-US", {
                            style: "currency",
                            currency: product.currency,
                          }).format(Number(product.minimum_price))}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3 py-4 text-sm text-white/65">{t("No games found for “{search}”.", { search: search.trim() })}</p>
          )}
        </div>
      )}
    </form>
  );
}
