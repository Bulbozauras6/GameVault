import { useQuery } from "@tanstack/react-query";
import { Gamepad2, RefreshCw } from "lucide-react";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { fetchCategories, fetchHomepage, fetchPlatforms } from "./api/home";
import { DealsSection } from "./components/DealsSection";
import { GameVaultHeader } from "./components/GameVaultHeader";
import { HeroBanner } from "./components/HeroBanner";
import { BestSellersSection } from "./components/BestSellersSection";
import { CuratedSection } from "./components/CuratedSection";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { PlatformShortcuts } from "./components/PlatformShortcuts";
import { useTranslation } from "./i18n";
import { useAuthStore } from "./stores/authStore";
import { useCartStore } from "./stores/cartStore";

const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage").then(({ ProductDetailsPage }) => ({ default: ProductDetailsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(({ LoginPage }) => ({ default: LoginPage })));
const RegisterPage = lazy(() => import("./pages/RegisterPage").then(({ RegisterPage }) => ({ default: RegisterPage })));
const CartPage = lazy(() => import("./pages/CartPage.tsx").then(({ CartPage }) => ({ default: CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then(({ CheckoutPage }) => ({ default: CheckoutPage })));
const OrderDetailsPage = lazy(() => import("./pages/OrderDetailsPage").then(({ OrderDetailsPage }) => ({ default: OrderDetailsPage })));
const OrdersPage = lazy(() => import("./pages/OrdersPage").then(({ OrdersPage }) => ({ default: OrdersPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then(({ AccountPage }) => ({ default: AccountPage })));
const CataloguePage = lazy(() => import("./pages/CataloguePage").then(({ CataloguePage }) => ({ default: CataloguePage })));

function HomePage() {
  const { t } = useTranslation();
  const homeQuery = useQuery({
    queryKey: ["home"],
    queryFn: fetchHomepage,
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const platformsQuery = useQuery({
    queryKey: ["platforms"],
    queryFn: fetchPlatforms,
  });
  const sections = homeQuery.data?.sections ?? [];
  const banner = sections.find((section) => section.type === "banner");
  const bestSellers = sections.find((section) => section.type === "best_sellers");
  const deals = sections.find((section) => section.type === "deals");
  const curatedSections = sections.filter(
    (section) => section.type === "curated" && section.items.length > 0,
  );
  return (
    <div className="min-h-screen bg-[#4b0caf] text-white" id="top">
      <GameVaultHeader
        categories={categoriesQuery.data ?? []}
        platforms={platformsQuery.data ?? []}
        categoriesLoading={categoriesQuery.isLoading}
        categoriesError={categoriesQuery.isError}
      />

      <main>
        {homeQuery.isLoading ? (
          <div className="mx-auto max-w-[1000px] px-4 pb-20 pt-5">
            <LoadingSpinner centered label={t("Loading marketplace")} size="lg" />
          </div>
        ) : homeQuery.isError ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center">
            <p className="text-xl font-semibold">{t("We couldn’t load the marketplace right now.")}</p>
            <p className="mt-2 text-sm text-[#aaa5bd]">{t("Check that the GameVault API is running, then try again.")}</p>
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-sm bg-yellow-300 px-5 py-3 font-semibold text-[#17132b] transition hover:bg-yellow-200"
              onClick={() => void homeQuery.refetch()}
              type="button"
            >
              <RefreshCw size={17} />
              {t("Try again")}
            </button>
          </div>
        ) : (
          <>
            {banner && <HeroBanner section={banner} deals={deals} />}

            <div className="mx-auto max-w-[1000px] space-y-7 px-4 pb-12 pt-5 sm:space-y-8">
              <PlatformShortcuts platforms={platformsQuery.data ?? []} isLoading={platformsQuery.isLoading} />
              {categoriesQuery.data && categoriesQuery.data.length > 0 && (
                <nav aria-label={t("Browse categories")} className="flex items-center gap-2 overflow-x-auto border-b border-white/15 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {categoriesQuery.data.map((category) => (
                    <Link
                      className="shrink-0 rounded-full border border-white/20 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/15"
                      key={category.id}
                      to={`/catalogue?category=${encodeURIComponent(category.slug)}`}
                    >
                      {category.name}
                    </Link>
                  ))}
                </nav>
              )}
              {deals && <DealsSection section={deals} />}
              {bestSellers && <BestSellersSection section={bestSellers} />}
              <section aria-labelledby="browse-categories" className="space-y-4">
                <div>
                  <p className="text-2xs font-bold uppercase tracking-[0.18em] text-yellow-200">{t("Find your genre")}</p>
                  <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl" id="browse-categories">{t("Browse categories")}</h2>
                </div>
                {categoriesQuery.data && categoriesQuery.data.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {categoriesQuery.data.map((category) => (
                      <Link
                        className="rounded-full border border-yellow-200/15 bg-yellow-300/[0.08] px-4 py-2 text-xs font-semibold text-yellow-100 transition hover:-translate-y-0.5 hover:bg-yellow-300/[0.15]"
                        key={category.id}
                        to={`/catalogue?category=${encodeURIComponent(category.slug)}`}
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#8f8aa2]">
                    {categoriesQuery.isLoading
                      ? <span className="inline-flex items-center gap-2"><LoadingSpinner label={t("Loading categories")} size="sm" />{t("Loading categories")}</span>
                      : t("Categories will appear here as the catalogue grows.")}
                  </p>
                )}
              </section>
              {curatedSections.map((section) => <CuratedSection key={section.key} section={section} />)}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-white/[0.07] bg-[#141328]">
        <div className="mx-auto grid max-w-[1000px] gap-8 px-4 py-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link aria-label={t("GameVault home")} className="inline-flex items-center gap-2 font-bold text-white" to="/">
              <span className="grid size-8 place-items-center rounded-lg bg-yellow-200 text-[#17132b]"><Gamepad2 size={17} /></span>
              <span className="text-base">Game<span className="text-yellow-200">Vault</span></span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-5 text-[#9994aa]">{t("Discover digital games and compare offers from the GameVault marketplace.")}</p>
          </div>
          <FooterColumn heading={t("Explore")} links={[[t("All games"), "/catalogue"], [t("Best sellers"), "#best-sellers"], [t("Deals"), "#deals"]]} />
          <FooterColumn heading={t("Discover")} links={[[t("Categories"), "/catalogue"], [t("Platforms"), "#platforms-heading"], [t("Search games"), "#marketplace-search"]]} />
          <FooterColumn heading="GameVault" links={[[t("Marketplace"), "#top"], [t("Featured sections"), "#deals"], [t("Back to top"), "#top"]]} />
        </div>
        <div className="border-t border-white/[0.06] py-3 text-center text-2xs text-[#77728a]">© {new Date().getFullYear()} GameVault</div>
      </footer>
    </div>
  );
}

function FooterColumn({ heading, links }: { heading: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-white">{heading}</h2>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("/") ? (
              <Link className="text-xs text-[#9994aa] transition hover:text-yellow-200" to={href}>{label}</Link>
            ) : (
              <a className="text-xs text-[#9994aa] transition hover:text-yellow-200" href={href}>{label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-screen place-items-center bg-[#4b0caf] px-5 text-center text-white">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-yellow-200">{t("404 · Page not found")}</p>
        <h1 className="mt-3 text-3xl font-extrabold">{t("This page isn’t in the catalogue.")}</h1>
        <Link className="mt-6 inline-flex rounded-sm bg-yellow-300 px-5 py-3 text-sm font-bold text-[#24103f]" to="/">{t("Back to GameVault")}</Link>
      </div>
    </main>
  );
}

export default function App() {
  const { t } = useTranslation();
  const initializeAuth = useAuthStore((state) => state.initialize);
  const authInitialized = useAuthStore((state) => state.initialized);
  const authUserId = useAuthStore((state) => state.user?.id ?? null);
  const loadCart = useCartStore((state) => state.loadCart);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (authInitialized) void loadCart();
  }, [authInitialized, authUserId, loadCart]);

  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#4b0caf]"><LoadingSpinner centered label={t("Loading marketplace")} size="lg" /></div>}>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<CataloguePage />} path="/catalogue" />
        <Route element={<ProductDetailsPage />} path="/products/:slug" />
        <Route element={<CartPage />} path="/cart" />
        <Route element={<RequireAuthentication><CheckoutPage /></RequireAuthentication>} path="/checkout" />
        <Route element={<RequireAuthentication><OrdersPage /></RequireAuthentication>} path="/orders" />
        <Route element={<RequireAuthentication><AccountPage /></RequireAuthentication>} path="/account" />
        <Route element={<RequireAuthentication><OrderDetailsPage success /></RequireAuthentication>} path="/orders/:orderId/success" />
        <Route element={<RequireAuthentication><OrderDetailsPage /></RequireAuthentication>} path="/orders/:orderId" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </Suspense>
  );
}

function RequireAuthentication({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const location = useLocation();

  if (!initialized) {
    return <div className="grid min-h-screen place-items-center bg-[#4b0caf]"><LoadingSpinner centered label={t("Checking account")} size="lg" /></div>;
  }

  if (!user) {
    return <Navigate replace state={{ from: `${location.pathname}${location.search}` }} to="/login" />;
  }

  return children;
}
