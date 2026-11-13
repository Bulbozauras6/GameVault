import { isAxiosError } from "axios";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createCheckout } from "../api/orders";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { CartMergeNotice } from "../components/CartMergeNotice";
import { CheckoutProgress } from "../components/CheckoutProgress";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useCartStore } from "../stores/cartStore";
import { useTranslation } from "../i18n";

function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}

function checkoutErrorMessage(error: unknown): string {
  if (isAxiosError<{ errors?: Record<string, string[]>; message?: string }>(error)) {
    const validationMessage = Object.values(error.response?.data?.errors ?? {}).flat()[0];
    return validationMessage ?? error.response?.data?.message ?? "Checkout could not be completed. Please try again.";
  }

  return "Checkout could not be completed. Please try again.";
}

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cart = useCartStore((state) => state.cart);
  const loading = useCartStore((state) => state.loading);
  const cartError = useCartStore((state) => state.error);
  const loadCart = useCartStore((state) => state.loadCart);
  const clearCart = useCartStore((state) => state.clear);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    void loadCart(true);
  }, [loadCart]);

  async function submitCheckout() {
    setSubmitting(true);
    setCheckoutError(null);

    try {
      const order = await createCheckout();
      clearCart();
      navigate(`/orders/${order.id}/success`, { replace: true });
    } catch (error) {
      setCheckoutError(t(checkoutErrorMessage(error)));
      await loadCart(true);
    } finally {
      setSubmitting(false);
    }
  }

  const hasMultipleCurrencies = (cart?.totals_by_currency.length ?? 0) > 1;
  const hasUnavailableItems = cart?.items.some((item) => !item.is_available) ?? false;
  const canSubmit = Boolean(
    cart
    && cart.items.length > 0
    && !hasMultipleCurrencies
    && !hasUnavailableItems
    && !submitting,
  );

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <AccountPageHeader />
      <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <CheckoutProgress currentStep={2} />
        <CartMergeNotice />
        <Link className="inline-flex items-center gap-2 text-xs font-bold text-white/75 hover:text-white" to="/cart">
          <ArrowLeft size={15} /> {t("Back to cart")}
        </Link>

        <div className="mt-4">
          <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">{t("Review your order")}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("Checkout")}</h1>
          <p className="mt-2 text-sm text-white/70">{t("This is a simulated purchase. No payment will be processed.")}</p>
        </div>

        {checkoutError && (
          <div className="mt-5 border border-rose-200/30 bg-rose-300/10 p-3 text-sm text-rose-100" role="alert">
            {checkoutError}
          </div>
        )}

        {loading && !cart ? (
          <div className="mt-6"><LoadingSpinner centered label={t("Loading checkout")} size="lg" /></div>
        ) : !cart ? (
          <div className="mt-6 border border-rose-200/20 bg-[#350879] p-5 text-sm text-white/85">
            {t(cartError ?? "Your cart could not be loaded.")}
            <button className="ml-3 font-bold text-yellow-200 underline" onClick={() => void loadCart(true)} type="button">{t("Retry")}</button>
          </div>
        ) : cart.items.length === 0 ? (
          <section className="mt-6 flex flex-col items-center border border-white/15 bg-[#350879] px-5 py-12 text-center">
            <CheckCircle2 className="text-yellow-200" size={32} />
            <h2 className="mt-4 text-lg font-extrabold">{t("Your cart is empty")}</h2>
            <p className="mt-2 text-sm text-white/65">{t("Add a game offer before starting checkout.")}</p>
            <Link className="mt-5 rounded-sm bg-yellow-300 px-5 py-3 text-sm font-extrabold text-[#24103f] hover:bg-yellow-200" to="/">{t("Explore games")}</Link>
          </section>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-label={t("Order items")} className="space-y-3">
              {cart.items.map((item) => (
                <article className="grid gap-3 border border-white/15 bg-[#5b1bc2] p-3 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4" key={item.id}>
                  <div className="size-[72px] overflow-hidden bg-[#321072]">
                    {item.product.image
                      ? <img alt={item.product.image.alt_text ?? item.product.title} className="size-full object-cover" src={item.product.image.url} />
                      : <div className="grid size-full place-items-center text-white/40">{t("Game")}</div>}
                  </div>
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-sm font-extrabold">{item.product.title}</h2>
                    <p className="mt-1 truncate text-xs text-white/70">{item.platform.name} · {item.region.name} · {item.seller.name}</p>
                    <p className="mt-1 text-xs text-white/65">{t("Quantity")}: {item.quantity}</p>
                    {!item.is_available && (
                      <p className="mt-1 text-xs font-bold text-yellow-200">{t("This offer no longer has enough stock.")}</p>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-3 sm:block sm:text-right">
                    <p className="text-xs text-white/70">{t("{price} each", { price: formatPrice(item.price, item.currency) })}</p>
                    <p className="text-sm font-extrabold text-yellow-200">{formatPrice(item.subtotal, item.currency)}</p>
                  </div>
                </article>
              ))}
            </section>

            <aside className="border border-white/15 bg-[#350879] p-4 sm:p-5 lg:sticky lg:top-5">
              <h2 className="text-base font-extrabold">{t("Order summary")}</h2>
              <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
                {cart.totals_by_currency.map((total) => (
                  <div className="flex items-center justify-between gap-3" key={total.currency}>
                    <span className="text-xs text-white/70">
                      {cart.totals_by_currency.length > 1 ? t("Subtotal ({currency})", { currency: total.currency }) : t("Total")}
                    </span>
                    <span className="text-lg font-extrabold text-yellow-200">{formatPrice(total.subtotal, total.currency)}</span>
                  </div>
                ))}
              </div>

              {hasMultipleCurrencies && (
                <p className="mt-4 text-xs leading-5 text-yellow-100" role="alert">
                  {t("A single order must use one currency. Remove items in other currencies from your cart to continue.")}
                </p>
              )}
              {hasUnavailableItems && (
                <p className="mt-4 text-xs leading-5 text-yellow-100" role="alert">
                  {t("One or more offers are unavailable. Update your cart before continuing.")}
                </p>
              )}

              <div className="mt-4 flex items-start gap-2 border-t border-white/15 pt-4 text-xs leading-5 text-white/70">
                <ShieldCheck className="mt-0.5 shrink-0 text-yellow-200" size={15} />
                {t("Prices and stock are verified securely when you confirm the order.")}
              </div>
              <button
                className="mt-5 w-full rounded-sm bg-yellow-300 px-4 py-3 text-sm font-extrabold text-[#24103f] transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSubmit || loading}
                onClick={() => void submitCheckout()}
                type="button"
              >
                {submitting ? t("Processing order…") : t("Confirm simulated order")}
              </button>
              <p className="mt-3 text-center text-2xs text-white/55">{t("No real payment information is collected.")}</p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
