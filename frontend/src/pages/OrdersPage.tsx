import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchOrders } from "../api/orders";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTranslation } from "../i18n";

function formatPrice(price: string, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(price));
}

export function OrdersPage() {
  const { t } = useTranslation();
  const ordersQuery = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
  });
  const orders = ordersQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <AccountPageHeader />
      <main className="mx-auto max-w-[980px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <Link className="inline-flex items-center gap-2 text-xs font-bold text-white/75 hover:text-white" to="/">
          <ArrowLeft size={15} /> {t("Continue shopping")}
        </Link>
        <div className="mt-4">
          <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">{t("Your account")}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("Order history")}</h1>
        </div>

        {ordersQuery.isLoading ? (
          <div className="mt-6"><LoadingSpinner centered label={t("Loading orders")} size="lg" /></div>
        ) : ordersQuery.isError ? (
          <section className="mt-6 border border-rose-200/20 bg-[#350879] p-5" role="alert">
            <p className="text-sm font-bold text-rose-100">
              {isAxiosError(ordersQuery.error) && ordersQuery.error.response?.status === 401
                ? t("Please log in to view your orders.")
                : t("Your order history could not be loaded.")}
            </p>
            <button className="mt-3 text-xs font-bold text-yellow-200 underline" onClick={() => void ordersQuery.refetch()} type="button">
              {t("Try again")}
            </button>
          </section>
        ) : orders.length === 0 ? (
          <section className="mt-6 flex flex-col items-center border border-white/15 bg-[#350879] px-5 py-12 text-center">
            <ClipboardList className="text-yellow-200" size={30} />
            <h2 className="mt-4 text-lg font-extrabold">{t("No orders yet")}</h2>
            <p className="mt-2 text-sm text-white/65">{t("Completed purchases will appear here.")}</p>
            <Link className="mt-5 rounded-sm bg-yellow-300 px-5 py-3 text-sm font-extrabold text-[#24103f]" to="/">{t("Explore games")}</Link>
          </section>
        ) : (
          <section aria-label={t("Your orders")} className="mt-6 space-y-3">
            {orders.map((order) => (
              <article className="flex flex-col gap-4 border border-white/15 bg-[#5b1bc2] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5" key={order.id}>
                <div className="min-w-0">
                  <p className="text-2xs font-bold uppercase tracking-wide text-yellow-200">{t("Order #{order}", { order: order.order_number })}</p>
                  <p className="mt-1 text-sm font-bold">{order.item_count} {t(order.item_count === 1 ? "item" : "items")}</p>
                  <p className="mt-1 text-xs text-white/60">
                    {order.placed_at ? new Date(order.placed_at).toLocaleString() : t("Date unavailable")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-base font-extrabold text-yellow-200">{formatPrice(order.total, order.currency)}</p>
                  <Link className="rounded-sm border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/10" to={`/orders/${order.id}`}>
                    {t("View order")}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
