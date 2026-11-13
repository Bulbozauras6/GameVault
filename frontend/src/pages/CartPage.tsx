import { useEffect } from "react";
import { AlertCircle, ArrowLeft, Gamepad2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { CartMergeNotice } from "../components/CartMergeNotice";
import { CheckoutProgress } from "../components/CheckoutProgress";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTranslation } from "../i18n";
import { useCartStore } from "../stores/cartStore";

function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}

export function CartPage() {
  const { t } = useTranslation();
  const cart = useCartStore((state) => state.cart);
  const loading = useCartStore((state) => state.loading);
  const pending = useCartStore((state) => state.pending);
  const error = useCartStore((state) => state.error);
  const loadCart = useCartStore((state) => state.loadCart);
  const updateItem = useCartStore((state) => state.updateItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearError = useCartStore((state) => state.clearError);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <AccountPageHeader />

      <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <CheckoutProgress currentStep={1} />
        <CartMergeNotice />
        <Link className="inline-flex items-center gap-2 text-xs font-bold text-white/75 hover:text-white" to="/">
          <ArrowLeft size={15} /> {t("Continue shopping")}
        </Link>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">{t("Your picks")}</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("Shopping cart")}</h1>
          </div>
          {cart && <span className="pb-1 text-xs text-white/70">{cart.item_count} {t(cart.item_count === 1 ? "item" : "items")}</span>}
        </div>

        {error && (
          <div className="mt-5 flex items-start justify-between gap-3 border border-rose-200/30 bg-rose-300/10 p-3 text-sm text-rose-100" role="alert">
            <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 shrink-0" size={16} />{t(error)}</span>
            <button aria-label={t("Dismiss cart error")} className="font-bold" onClick={clearError} type="button">×</button>
          </div>
        )}

        {loading && !cart ? (
          <div className="mt-6"><LoadingSpinner centered label={t("Loading cart")} size="lg" /></div>
        ) : !cart ? (
          <div className="mt-6 border border-rose-200/20 bg-[#350879] p-5 text-sm text-white/85">
            {t("Your cart couldn’t be loaded. Check your connection and try again.")}
            <button className="ml-3 font-bold text-yellow-200 underline" onClick={() => void loadCart()} type="button">{t("Retry")}</button>
          </div>
        ) : cart.items.length === 0 ? (
          <section className="mt-6 flex flex-col items-center border border-white/15 bg-[#350879] px-5 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-white/10 text-yellow-200"><ShoppingCart size={25} /></span>
            <h2 className="mt-4 text-lg font-extrabold">{t("Your cart is empty")}</h2>
            <p className="mt-2 max-w-sm text-sm leading-5 text-white/65">{t("Browse the marketplace and add a game offer when you find one you like.")}</p>
            <Link className="mt-5 rounded-sm bg-yellow-300 px-5 py-3 text-sm font-extrabold text-[#24103f] hover:bg-yellow-200" to="/">{t("Explore games")}</Link>
          </section>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section aria-label={t("Cart items")} className="space-y-3">
              {cart.items.map((item) => (
                <article className="grid gap-3 border border-white/15 bg-[#5b1bc2] p-3 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4" key={item.id}>
                  <Link aria-label={t("View {product}", { product: item.product.title })} className="block h-24 w-full overflow-hidden bg-[#321072] sm:h-[106px] sm:w-[78px]" to={`/products/${encodeURIComponent(item.product.slug)}`}>
                    {item.product.image ? (
                      <img alt={item.product.image.alt_text ?? item.product.title} className="size-full object-cover" loading="lazy" src={item.product.image.url} />
                    ) : (
                      <span className="grid size-full place-items-center text-white/45"><Gamepad2 size={28} /></span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link className="line-clamp-2 text-sm font-extrabold hover:text-yellow-100 sm:text-base" to={`/products/${encodeURIComponent(item.product.slug)}`}>{item.product.title}</Link>
                    <p className="mt-1 truncate text-xs text-white/70">{item.platform.name} · {item.region.name}</p>
                    <p className="mt-1 truncate text-xs text-white/60">{t("Seller: {seller}", { seller: item.seller.name })}</p>
                    {!item.is_available && <p className="mt-1 text-xs font-bold text-yellow-200">{t("This offer is currently unavailable.")}</p>}
                    <div className="mt-3 flex items-center justify-between gap-3 sm:justify-start">
                      <div className="inline-flex items-center border border-white/20">
                        <button
                          aria-label={t("Decrease {product} quantity", { product: item.product.title })}
                          className="grid size-8 place-items-center text-white hover:bg-white/10 disabled:opacity-40"
                          disabled={pending || item.quantity <= 1 || !item.is_available}
                          onClick={() => void updateItem(item.id, item.quantity - 1)}
                          type="button"
                        ><Minus size={13} /></button>
                        <span aria-label={t("{count} items", { count: item.quantity })} className="min-w-8 text-center text-xs font-bold">{item.quantity}</span>
                        <button
                          aria-label={t("Increase {product} quantity", { product: item.product.title })}
                          className="grid size-8 place-items-center text-white hover:bg-white/10 disabled:opacity-40"
                          disabled={pending || item.quantity >= item.available_stock || !item.is_available}
                          onClick={() => void updateItem(item.id, item.quantity + 1)}
                          type="button"
                        ><Plus size={13} /></button>
                      </div>
                      <button
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-white/65 hover:text-rose-100 disabled:opacity-50"
                        disabled={pending}
                        onClick={() => void removeItem(item.id)}
                        type="button"
                      ><Trash2 size={13} /> {t("Remove")}</button>
                    </div>
                  </div>
                  <div className="flex items-end justify-between gap-2 sm:block sm:text-right">
                    <p className="text-xs font-bold text-yellow-200">{formatPrice(item.price, item.currency)} <span className="font-medium text-white/65">{t("each")}</span></p>
                    <p className="text-sm font-extrabold">{formatPrice(item.subtotal, item.currency)}</p>
                  </div>
                </article>
              ))}
            </section>

            <aside className="border border-white/15 bg-[#350879] p-4 sm:p-5 lg:sticky lg:top-5">
              <h2 className="text-base font-extrabold">{t("Cart summary")}</h2>
              <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
                {cart.totals_by_currency.map((total) => (
                  <div className="flex items-center justify-between gap-3" key={total.currency}>
                    <span className="text-xs text-white/70">{cart.totals_by_currency.length > 1 ? t("Subtotal ({currency})", { currency: total.currency }) : t("Subtotal")}</span>
                    <span className="text-lg font-extrabold text-yellow-200">{formatPrice(total.subtotal, total.currency)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-white/15 pt-3 text-xs leading-5 text-white/60">
                {t("Prices and stock are verified again when you confirm your simulated order.")}
              </p>
              <Link
                className="mt-5 block rounded-sm bg-yellow-300 px-4 py-3 text-center text-sm font-extrabold text-[#24103f] transition hover:bg-yellow-200"
                to="/checkout"
              >
                {t("Continue to checkout")}
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
