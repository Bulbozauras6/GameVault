import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Gamepad2, Globe2, Monitor, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProduct } from "../api/home";
import type { MarketplaceOffer, ProductDetail, ProductImage } from "../api/types";
import { AccountControls } from "../components/AccountControls";
import { CartLink } from "../components/CartLink";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { MarketplaceSearch } from "../components/MarketplaceSearch";
import { useTranslation } from "../i18n";
import { useCartStore } from "../stores/cartStore";

function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}

function discountPercent(offer: MarketplaceOffer): number {
  if (!offer.compare_at_price || Number(offer.compare_at_price) <= Number(offer.price)) return 0;
  return Math.round((1 - Number(offer.price) / Number(offer.compare_at_price)) * 100);
}

function primaryImage(images: ProductImage[] | undefined): ProductImage | undefined {
  return images?.find((image) => image.is_primary) ?? images?.[0];
}

interface OfferFeedback {
  offerId: number;
  status: "success" | "error";
  message: string;
}

export function ProductDetailsPage() {
  const { t } = useTranslation();
  const { slug = "" } = useParams<{ slug: string }>();
  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct(slug),
    enabled: slug.length > 0,
  });

  if (productQuery.isLoading) return <ProductLoadingState />;

  if (productQuery.isError) {
    const notFound = productQuery.error instanceof AxiosError && productQuery.error.response?.status === 404;

    return (
      <ProductMessage
        eyebrow={t(notFound ? "404 · Game not found" : "Something went wrong")}
        message={t(notFound ? "We couldn’t find that game in the GameVault catalogue." : "We couldn’t load this product. Check your connection and try again.")}
        retry={!notFound ? () => void productQuery.refetch() : undefined}
      />
    );
  }

  if (!productQuery.data) {
    return <ProductMessage eyebrow={t("404 · Game not found")} message={t("We couldn’t find that game in the GameVault catalogue.")} />;
  }

  return <ProductDetails product={productQuery.data} key={slug} />;
}

function ProductDetails({ product }: { product: ProductDetail }) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const [offerFeedback, setOfferFeedback] = useState<OfferFeedback | null>(null);
  const [addingOfferId, setAddingOfferId] = useState<number | null>(null);
  const [addedOfferId, setAddedOfferId] = useState<number | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const pendingCart = useCartStore((state) => state.pending);
  const clearCartError = useCartStore((state) => state.clearError);
  const image = primaryImage(product.images);
  const sortedOffers = [...product.offers].sort((a, b) => Number(a.price) - Number(b.price));
  const platforms = product.platforms ?? [];
  const regions = product.regions ?? [];

  useEffect(() => {
    if (addedOfferId === null) return;

    const timeoutId = window.setTimeout(() => {
      setAddedOfferId((current) => current === addedOfferId ? null : current);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [addedOfferId]);

  async function addOfferToCart(offer: MarketplaceOffer) {
    setOfferFeedback(null);
    setAddedOfferId(null);
    clearCartError();

    setAddingOfferId(offer.id);
    try {
      await addItem(offer.id, { product, offer });
      setAddedOfferId(offer.id);
      setOfferFeedback({
        offerId: offer.id,
        status: "success",
        message: t("{seller}'s offer was added to your cart.", { seller: offer.seller.name }),
      });
    } catch {
      setOfferFeedback({
        offerId: offer.id,
        status: "error",
        message: t(useCartStore.getState().error ?? "This offer could not be added to your cart."),
      });
    } finally {
      setAddingOfferId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <header className="border-b border-white/10 bg-[#4a0bab]">
        <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-2 sm:min-h-[68px] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-5 sm:px-6 sm:py-0">
          <Link aria-label={t("GameVault home")} className="flex min-w-0 items-center gap-2 font-extrabold tracking-tight" to="/">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-yellow-200 to-yellow-400 text-[#32106c]">
              <Gamepad2 size={21} />
            </span>
            <span className="truncate">Game<span className="text-yellow-200">Vault</span></span>
          </Link>
          <MarketplaceSearch className="col-span-2 row-start-2 sm:col-span-1 sm:row-auto" />
          <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3 sm:row-auto">
            <CartLink />
            <AccountControls />
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <Link aria-label={t("Back to marketplace")} className="hidden items-center gap-2 rounded-sm px-2 py-2 text-xs font-bold text-white/90 transition hover:bg-white/10 sm:inline-flex sm:px-3 sm:text-sm" to="/">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{t("Back to marketplace")}</span>
            </Link>
          </div>
          <div className="col-span-2 justify-self-end sm:hidden"><LanguageSwitcher /></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 pb-14 pt-5 sm:px-6 sm:pt-7">
        <nav aria-label={t("Breadcrumb")} className="mb-5 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-white/65">
          <Link className="shrink-0 hover:text-white" to="/">{t("Marketplace")}</Link>
          <ChevronRight className="shrink-0" size={13} />
          {product.categories?.[0] && (
            <>
              <span className="shrink-0">{product.categories[0].name}</span>
              <ChevronRight className="shrink-0" size={13} />
            </>
          )}
          <span aria-current="page" className="truncate text-white/90">{product.title}</span>
        </nav>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(340px,390px)] lg:gap-8">
          <div className="min-w-0">
            <section className="grid gap-5 rounded-sm border border-white/10 bg-[#3e098f]/50 p-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:p-6">
              <div className="mx-auto w-full max-w-[260px] overflow-hidden bg-[#321072] sm:mx-0">
                {image && !imageFailed ? (
                  <img
                    alt={image.alt_text ?? `${product.title} cover`}
                    className="aspect-[0.78/1] size-full object-cover"
                    onError={() => setImageFailed(true)}
                    src={image.url}
                  />
                ) : (
                  <div className="grid aspect-[0.78/1] place-items-center text-white/45">
                    <Gamepad2 size={64} strokeWidth={1} />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">{t("GameVault digital game")}</p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl lg:text-[36px]">{product.title}</h1>
                {product.short_description && (
                  <p className="mt-3 text-sm leading-6 text-white/80">{product.short_description}</p>
                )}
                <div className="mt-5 grid gap-4 border-t border-white/15 pt-4 sm:grid-cols-2">
                  <div className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-yellow-200"><Monitor size={18} /></span>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold">{t("Available platforms")}</h2>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {platforms.length > 0 ? platforms.map((platform) => (
                          <span className="rounded-sm bg-white/10 px-2 py-1 text-2xs font-semibold text-white/85" key={platform.id}>{platform.name}</span>
                        )) : <span className="text-xs text-white/60">{t("See seller offers")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-yellow-200"><Globe2 size={18} /></span>
                    <div className="min-w-0">
                      <h2 className="text-xs font-bold">{t("Available regions")}</h2>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {regions.length > 0 ? regions.map((region) => (
                          <span className="rounded-sm bg-white/10 px-2 py-1 text-2xs font-semibold text-white/85" key={region.id}>{region.name}</span>
                        )) : <span className="text-xs text-white/60">{t("See seller offers")}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/15 pt-3 text-xs text-white/65">
                  {product.developer && <span>{t("Developer:")} <strong className="font-semibold text-white/90">{product.developer}</strong></span>}
                  {product.publisher && <span>{t("Publisher:")} <strong className="font-semibold text-white/90">{product.publisher}</strong></span>}
                  {product.release_date && <span>{t("Release date:")} <strong className="font-semibold text-white/90">{product.release_date}</strong></span>}
                </div>
              </div>
            </section>

            <section className="mt-6 border border-yellow-200/50 bg-[#350879] p-4 sm:p-5">
              <h2 className="text-sm font-bold text-yellow-200">{t("About this game")}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-white/80">
                {product.description || product.short_description || t("Game description is not available.")}
              </p>
            </section>
          </div>

          <aside aria-labelledby="seller-offers-heading" className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">{t("Compare marketplace listings")}</p>
                <h2 className="mt-1 text-xl font-extrabold" id="seller-offers-heading">{t("Seller offers")}</h2>
              </div>
              <span className="pb-0.5 text-xs text-white/65">{t("{count} available", { count: sortedOffers.length })}</span>
            </div>

            {sortedOffers.length > 0 ? (
              <div className="mt-4 space-y-3">
                {sortedOffers.map((offer) => (
                  <OfferCard
                    added={addedOfferId === offer.id}
                    adding={addingOfferId === offer.id}
                    feedback={offerFeedback?.offerId === offer.id ? offerFeedback : null}
                    key={offer.id}
                    offer={offer}
                    unavailable={!offer.available_stock || offer.available_stock < 1}
                    pending={pendingCart}
                    onAdd={() => addOfferToCart(offer)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-white/25 bg-white/[0.05] px-4 py-8 text-center">
                <p className="text-sm font-semibold">{t("No active offers right now")}</p>
                <p className="mt-1 text-xs text-white/65">{t("Check back later for new seller listings.")}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2 border border-white/10 bg-[#350879] p-3 text-xs leading-5 text-white/70">
              <Globe2 className="mt-0.5 shrink-0 text-yellow-200" size={15} />
              {t("Review platform and region details before selecting an offer.")}
            </div>
          </aside>
        </div>

        <Link className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white/90 hover:text-yellow-200" to="/">
          <ArrowLeft size={16} /> {t("Continue browsing games")} <ArrowUpRight size={14} />
        </Link>
      </main>
    </div>
  );
}

function OfferCard({
  offer,
  onAdd,
  pending,
  adding,
  added,
  feedback,
  unavailable,
}: {
  offer: MarketplaceOffer;
  onAdd: () => void | Promise<void>;
  pending: boolean;
  adding: boolean;
  added: boolean;
  feedback: OfferFeedback | null;
  unavailable: boolean;
}) {
  const { t } = useTranslation();
  const discount = discountPercent(offer);

  return (
    <article className="border border-white/15 bg-[#5b1bc2] p-4 transition hover:border-white/35">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{offer.seller.name}</p>
          <p className="mt-1 text-2xs text-white/65">{t("Digital key · instant delivery")}</p>
        </div>
        {discount > 0 && (
          <span className="shrink-0 rounded-sm bg-pink-400 px-2 py-1 text-2xs font-extrabold text-[#241022]">-{discount}%</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {offer.platform && <span className="rounded-sm bg-white/10 px-2 py-1 text-2xs font-semibold">{offer.platform.name}</span>}
        {offer.region && <span className="rounded-sm bg-white/10 px-2 py-1 text-2xs font-semibold">{offer.region.name}</span>}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-3">
        <div>
          <p className="text-2xs font-bold uppercase tracking-wide text-white/60">{t("Price")}</p>
          <p className="mt-0.5 text-xl font-extrabold text-yellow-200">{formatPrice(offer.price, offer.currency)}</p>
          {offer.compare_at_price && Number(offer.compare_at_price) > Number(offer.price) && (
            <p className="text-2xs text-white/60 line-through">{formatPrice(offer.compare_at_price, offer.currency)}</p>
          )}
        </div>
        <button
          aria-label={unavailable
            ? t("{seller}'s offer is out of stock", { seller: offer.seller.name })
            : added
              ? t("Added to cart")
              : t("Add {seller}'s offer to cart", { seller: offer.seller.name })}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-sm px-3 py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 ${
            added
              ? "bg-emerald-300 text-[#083b34] hover:bg-emerald-200"
              : unavailable
                ? "bg-white/15 text-white/55"
                : "bg-yellow-300 text-[#24103f] hover:bg-yellow-200"
          }`}
          disabled={pending || added || unavailable}
          onClick={() => void onAdd()}
          type="button"
        >
          {added ? <Check aria-hidden="true" size={15} /> : <ShoppingCart aria-hidden="true" size={15} />}
          <span>{adding ? t("Adding…") : added ? t("Added to cart") : unavailable ? t("Out of stock") : t("Add to cart")}</span>
        </button>
      </div>
      {feedback && (
        <p
          aria-live="polite"
          className={`mt-3 border p-2.5 text-xs ${
            feedback.status === "success"
              ? "border-emerald-200/30 bg-emerald-300/10 text-emerald-50"
              : "border-rose-200/30 bg-rose-300/10 text-rose-100"
          }`}
          role={feedback.status === "success" ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      )}
    </article>
  );
}

function ProductLoadingState() {
  const { t } = useTranslation();

  return (
    <main aria-label={t("Loading product")} className="grid min-h-screen place-items-center bg-[#4b0caf] px-4 py-8 text-white">
      <LoadingSpinner centered label={t("Loading product")} size="lg" />
    </main>
  );
}

function ProductMessage({ eyebrow, message, retry }: { eyebrow: string; message: string; retry?: () => void }) {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-screen place-items-center bg-[#4b0caf] px-5 text-center text-white">
      <div className="max-w-lg">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-200">{eyebrow}</p>
        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{t("Product details unavailable")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/75">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {retry && <button className="rounded-sm bg-yellow-300 px-5 py-3 text-sm font-bold text-[#24103f]" onClick={retry} type="button">{t("Try again")}</button>}
          <Link className="rounded-sm border border-white/35 px-5 py-3 text-sm font-bold hover:bg-white/10" to="/">{t("Back to homepage")}</Link>
        </div>
      </div>
    </main>
  );
}
