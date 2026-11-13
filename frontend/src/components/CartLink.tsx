import { Gamepad2, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LoadingSpinner } from "./LoadingSpinner";
import { useTranslation } from "../i18n";
import { useCartStore } from "../stores/cartStore";

function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}

export function CartLink() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; right: number } | null>(null);
  const location = useLocation();
  const cart = useCartStore((state) => state.cart);
  const itemCount = cart?.item_count ?? 0;
  const loading = useCartStore((state) => state.loading);
  const pending = useCartStore((state) => state.pending);
  const error = useCartStore((state) => state.error);
  const miniCartOpen = useCartStore((state) => state.miniCartOpen);
  const loadCart = useCartStore((state) => state.loadCart);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearError = useCartStore((state) => state.clearError);
  const toggleMiniCart = useCartStore((state) => state.toggleMiniCart);
  const closeMiniCart = useCartStore((state) => state.closeMiniCart);

  useEffect(() => {
    closeMiniCart();
  }, [location.pathname, closeMiniCart]);

  useEffect(() => {
    if (!miniCartOpen) return;

    function updatePopoverPosition() {
      const container = containerRef.current;
      const header = container?.closest("header");
      if (!container || !header) return;

      const containerBounds = container.getBoundingClientRect();
      const headerBottom = header.getBoundingClientRect().bottom;
      const mobile = window.matchMedia("(max-width: 639px)").matches;
      const right = mobile
        ? containerBounds.right - (document.documentElement.clientWidth - 8)
        : 0;
      setPopoverPosition({ top: headerBottom - containerBounds.top + 8, right });
    }

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    return () => window.removeEventListener("resize", updatePopoverPosition);
  }, [miniCartOpen]);

  useEffect(() => {
    if (!miniCartOpen) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        closeMiniCart();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMiniCart();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [miniCartOpen, closeMiniCart]);

  function handleToggle() {
    if (!miniCartOpen) void loadCart();
    toggleMiniCart();
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        aria-controls="mini-cart-popover"
        aria-expanded={miniCartOpen}
        aria-haspopup="dialog"
        aria-label={t("Shopping cart ({count})", { count: itemCount })}
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-200 sm:size-10"
        onClick={handleToggle}
        ref={triggerRef}
        type="button"
      >
        <ShoppingCart aria-hidden="true" size={19} />
        {itemCount > 0 && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-yellow-300 px-1 text-2xs font-extrabold leading-none text-[#24103f]">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>

      {miniCartOpen && (
        <div
          aria-labelledby="mini-cart-heading"
          className="absolute z-[100] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-white/15 bg-[#21143a] text-white shadow-2xl"
          id="mini-cart-popover"
          role="dialog"
          style={popoverPosition ?? { right: 0, top: "calc(100% + 0.625rem)" }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-extrabold" id="mini-cart-heading">{t("Your cart")}</h2>
              <p className="mt-0.5 text-xs text-white/65">{t(itemCount === 1 ? "{count} item" : "{count} items", { count: itemCount })}</p>
            </div>
            <button
              aria-label={t("Close mini cart")}
              className="grid size-8 place-items-center rounded-sm text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-200"
              onClick={closeMiniCart}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
          </div>

          {loading && !cart ? (
            <div aria-live="polite" className="flex items-center justify-center gap-3 px-4 py-6 text-sm text-white/70">
              <LoadingSpinner label={t("Loading cart")} size="sm" />
              {t("Loading your cart…")}
            </div>
          ) : error && !cart ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-rose-100" role="alert">{error}</p>
              <button
                className="mt-3 text-sm font-bold text-yellow-200 underline underline-offset-2"
                onClick={() => void loadCart(true)}
                type="button"
              >
                {t("Try again")}
              </button>
            </div>
          ) : !cart ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-white/70">
              <LoadingSpinner label={t("Loading cart")} size="sm" />
              {t("Loading your cart…")}
            </div>
          ) : cart.items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <ShoppingCart aria-hidden="true" className="mx-auto text-white/45" size={24} />
              <p className="mt-2 text-sm font-semibold">{t("Your cart is empty")}</p>
              <p className="mt-1 text-xs text-white/65">{t("Browse games and find your next favorite.")}</p>
            </div>
          ) : (
            <ul aria-label={t("Cart items")} className="max-h-64 divide-y divide-white/10 overflow-y-auto">
              {cart.items.map((item) => (
                <li className="flex gap-3 px-3 py-3" key={item.id}>
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-sm bg-[#351d56]">
                    {item.product.image ? (
                      <img
                        alt={item.product.image.alt_text ?? item.product.title}
                        className="size-full object-cover"
                        src={item.product.image.url}
                      />
                    ) : (
                      <Gamepad2 aria-hidden="true" className="text-white/45" size={21} />
                    )}
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-2">
                    <div className="min-w-0">
                      <div className="flex items-start gap-1.5">
                        <p className="line-clamp-2 min-w-0 flex-1 text-xs font-bold leading-4">{item.product.title}</p>
                        <button
                          aria-busy={pending}
                          aria-label={t("Remove {product} from cart", { product: item.product.title })}
                          className="grid size-7 shrink-0 place-items-center rounded-sm text-white/55 transition hover:bg-rose-300/10 hover:text-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-200 disabled:cursor-wait disabled:opacity-50"
                          disabled={pending}
                          onClick={() => void removeItem(item.id)}
                          title={t("Remove {product} from cart", { product: item.product.title })}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </button>
                      </div>
                      <p className="mt-1 truncate text-2xs text-white/65">
                        {[item.platform?.name, item.region?.name].filter(Boolean).join(" · ") || t("Digital game key")}
                      </p>
                      <p className="mt-1 truncate text-2xs text-white/65">
                        {t("{seller} · Qty {quantity}", { seller: item.seller.name, quantity: item.quantity })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="whitespace-nowrap text-2xs text-white/65">
                        {t("{price} each", { price: formatPrice(item.price, item.currency) })}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-xs font-extrabold text-yellow-200">
                        {formatPrice(item.subtotal, item.currency)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && cart && (
            <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded-sm border border-rose-200/30 bg-rose-300/10 px-2 py-2 text-xs text-rose-100">
              <p role="alert">{t(error)}</p>
              <button
                aria-label={t("Dismiss cart error")}
                className="shrink-0 font-bold"
                onClick={clearError}
                type="button"
              >
                ×
              </button>
            </div>
          )}

          <div className="border-t border-white/10 bg-white/[0.03] px-4 py-3">
            {cart?.totals_by_currency.map((total) => (
              <div className="mb-3 flex items-center justify-between gap-3" key={total.currency}>
                <span className="text-sm font-semibold">{t("Cart total")}</span>
                <span className="text-base font-extrabold text-yellow-200">{formatPrice(total.subtotal, total.currency)}</span>
              </div>
            ))}
            {cart && cart.totals_by_currency.length === 0 && (
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>{t("Cart total")}</span>
                <span>—</span>
              </div>
            )}
            <Link
              className="flex min-h-10 items-center justify-center rounded-sm bg-yellow-300 px-4 py-2 text-sm font-extrabold text-[#24103f] transition hover:bg-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-200"
              onClick={closeMiniCart}
              to="/cart"
            >
              {t("View Cart")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
