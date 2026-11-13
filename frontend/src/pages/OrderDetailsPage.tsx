import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft, CheckCircle2, Gamepad2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { fetchOrder } from "../api/orders";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { CheckoutProgress } from "../components/CheckoutProgress";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTranslation } from "../i18n";

function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}

export function OrderDetailsPage({ success = false }: { success?: boolean }) {
  const { t } = useTranslation();
  const { orderId = "" } = useParams<{ orderId: string }>();
  const parsedOrderId = Number(orderId);
  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(parsedOrderId),
    enabled: Number.isSafeInteger(parsedOrderId) && parsedOrderId > 0,
  });

  const order = orderQuery.data;
  const notFound = !Number.isSafeInteger(parsedOrderId)
    || parsedOrderId <= 0
    || (isAxiosError(orderQuery.error) && orderQuery.error.response?.status === 404);

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <AccountPageHeader />
      <main className="mx-auto max-w-[980px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        {success && <CheckoutProgress currentStep={3} />}
        <Link className="inline-flex items-center gap-2 text-xs font-bold text-white/75 hover:text-white" to="/orders">
          <ArrowLeft size={15} /> {t("Order history")}
        </Link>

        {orderQuery.isLoading ? (
          <div className="mt-6"><LoadingSpinner centered label={t("Loading order")} size="lg" /></div>
        ) : orderQuery.isError || !order ? (
          <section className="mt-6 border border-white/15 bg-[#350879] p-5 sm:p-7">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">
              {notFound ? t("Order not found") : t("Order unavailable")}
            </p>
            <h1 className="mt-2 text-xl font-extrabold">
              {notFound ? t("We couldn’t find this order.") : t("We couldn’t load this order.")}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              {notFound
                ? t("The order may not exist or may belong to another account.")
                : t("Check your connection and try again from your order history.")}
            </p>
            <Link className="mt-5 inline-flex rounded-sm bg-yellow-300 px-4 py-2.5 text-sm font-bold text-[#24103f]" to="/orders">
              {t("View order history")}
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-5 flex flex-col gap-4 border border-yellow-200/30 bg-[#350879] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-yellow-200/15 text-yellow-200">
                  <CheckCircle2 size={24} />
                </span>
                <div>
                  <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">
                    {success ? t("Purchase complete") : t("Purchase details")}
                  </p>
                  <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">
                    {success ? t("Your order is confirmed") : t("Your order")}
                  </h1>
                  <p className="mt-1 break-all text-xs text-white/65">Order #{order.order_number}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-2xs font-bold uppercase tracking-wide text-white/60">{t("Order total")}</p>
                <p className="mt-1 text-xl font-extrabold text-yellow-200">{formatPrice(order.total, order.currency)}</p>
                {order.placed_at && (
                  <p className="mt-1 text-xs text-white/60">{new Date(order.placed_at).toLocaleString()}</p>
                )}
              </div>
            </section>

            <section aria-label={t("Purchased products and digital keys")} className="mt-5 space-y-3">
              {order.items.map((item) => (
                <article className="border border-white/15 bg-[#5b1bc2] p-4 sm:p-5" key={item.id}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center bg-white/10 text-yellow-200">
                      <Gamepad2 size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-extrabold">{item.product_title}</h2>
                      <p className="mt-1 text-xs text-white/70">
                        {item.platform_name} · {item.region_name} · {t("Sold by {seller}", { seller: item.seller_name })}
                      </p>
                      <p className="mt-1 text-xs text-white/65">
                        {item.quantity} × {formatPrice(item.unit_price, item.currency)} · {formatPrice(item.line_total, item.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/15 pt-4">
                    <h3 className="text-xs font-bold text-yellow-100">{t(item.digital_keys.length === 1 ? "Your digital key" : "Your digital keys")}</h3>
                    {item.digital_keys.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {item.digital_keys.map((digitalKey, index) => (
                          <li className="rounded-sm border border-white/15 bg-[#321072] p-3" key={digitalKey.id}>
                            <span className="mb-1 block text-2xs font-bold uppercase tracking-wide text-white/55">{t("Key {number}", { number: index + 1 })}</span>
                            <code className="block break-all font-mono text-sm font-bold tracking-wide text-yellow-200">{digitalKey.key}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-white/65">{t("No active digital keys are available for this item.")}</p>
                    )}
                  </div>
                </article>
              ))}
            </section>

            <nav aria-label={t("After checkout")} className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-sm bg-yellow-300 px-5 py-3 text-center text-sm font-extrabold text-[#24103f] hover:bg-yellow-200" to="/orders">
                {t("View order history")}
              </Link>
              <Link className="rounded-sm border border-white/20 px-5 py-3 text-center text-sm font-bold hover:bg-white/10" to="/">
                {t("Continue to GameVault")}
              </Link>
            </nav>
          </>
        )}
      </main>
    </div>
  );
}
