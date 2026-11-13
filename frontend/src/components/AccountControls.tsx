import { LogIn, LogOut, UserRound, UserRoundPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n";
import { LoadingSpinner } from "./LoadingSpinner";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";

export function AccountControls() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const loggingOut = useAuthStore((state) => state.loggingOut);
  const error = useAuthStore((state) => state.error);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);

  async function handleLogout() {
    try {
      await logout();
      useCartStore.getState().clear();
      navigate("/", { replace: true });
    } catch {
      // The store exposes the failure in the header without navigating away.
    }
  }

  return (
    <div className="relative flex shrink-0 items-center gap-1 sm:gap-2">
      {!initialized ? (
        <span aria-label={t("Checking account")} className="grid size-9 place-items-center">
          <LoadingSpinner label={t("Checking account")} size="sm" />
        </span>
      ) : user ? (
        <>
          <Link
            aria-label={t("Account settings")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-white transition hover:bg-white/10 sm:h-10 sm:text-sm"
            title={user.name}
            to="/account"
          >
            <UserRound size={15} />
            <span className="hidden max-w-36 truncate sm:inline">{user.name}</span>
          </Link>
          <button
            aria-label={loggingOut ? t("Logging out…") : t("Logout")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 sm:h-10 sm:text-sm"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            type="button"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">{loggingOut ? t("Logging out…") : t("Logout")}</span>
          </button>
        </>
      ) : (
        <>
          <Link aria-label={t("Log in")} className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-white transition hover:bg-white/10 sm:h-10 sm:px-2 sm:text-sm" to="/login">
            <LogIn size={15} />
            <span className="hidden sm:inline">{t("Log in")}</span>
          </Link>
          <Link aria-label={t("Register")} className="inline-flex h-9 items-center gap-1 rounded-sm bg-yellow-300 px-2 text-xs font-bold text-[#24103f] transition hover:bg-yellow-200 sm:h-10 sm:gap-2 sm:px-3 sm:text-sm" to="/register">
            <UserRoundPlus size={14} />
            <span className="hidden sm:inline">{t("Register")}</span>
          </Link>
        </>
      )}
      {error && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[60] flex w-64 items-start justify-between gap-3 border border-rose-200/30 bg-[#230c5d] p-3 text-xs text-rose-100 shadow-xl" role="alert">
          <span>{t(error)}</span>
          <button aria-label={t("Dismiss authentication error")} className="shrink-0 font-bold text-white" onClick={clearError} type="button">×</button>
        </div>
      )}
    </div>
  );
}
