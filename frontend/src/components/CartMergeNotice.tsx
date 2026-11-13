import { useTranslation } from "../i18n";
import { useCartStore } from "../stores/cartStore";

export function CartMergeNotice() {
  const { t } = useTranslation();
  const notice = useCartStore((state) => state.mergeNotice);
  const clearMergeNotice = useCartStore((state) => state.clearMergeNotice);

  if (!notice) return null;

  return (
    <div className="mt-5 space-y-2 border border-yellow-200/30 bg-yellow-300/10 p-3 text-sm text-yellow-50" role="status">
      {notice.changedPriceTitles.length > 0 && (
        <p>
          {t("Prices changed for {games}; the current prices are now shown in your cart.", {
            games: notice.changedPriceTitles.join(", "),
          })}
        </p>
      )}
      {notice.unavailableTitles.length > 0 && (
        <p>
          {t("These offers were unavailable and were not added: {games}.", {
            games: notice.unavailableTitles.join(", "),
          })}
        </p>
      )}
      <button
        className="text-xs font-bold underline underline-offset-2"
        onClick={clearMergeNotice}
        type="button"
      >
        {t("Dismiss")}
      </button>
    </div>
  );
}
