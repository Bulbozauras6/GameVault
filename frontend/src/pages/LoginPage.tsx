import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { getAuthApiError } from "../api/authErrors";
import { AuthLayout } from "../components/AuthLayout";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../stores/authStore";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const returnTo = (location.state as { from?: string } | null)?.from;
  const intendedPath = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const clearError = useAuthStore((state) => state.clearError);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginValues) {
    clearError();
    try {
      await login(values);
      navigate(intendedPath, { replace: true });
    } catch (error) {
      const apiError = getAuthApiError(error);
      const emailError = apiError.errors?.email?.[0];
      if (emailError) {
        setError("email", { type: "server", message: emailError });
      } else {
        setError("root.server", { type: "server", message: apiError.message });
      }
    }
  }

  return (
    <AuthLayout
      description={t(intendedPath.startsWith("/checkout")
        ? "Sign in is required to complete checkout. Your cart will be kept."
        : "Sign in to your account to continue exploring GameVault.")}
      footer={<>{t("New to GameVault?")} <Link className="font-bold text-yellow-200 hover:text-white" state={location.state} to="/register">{t("Create an account")}</Link></>}
      title={t("Welcome back")}
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit(submit)}>
        {errors.root?.server?.message && (
          <p className="border border-rose-200/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100" role="alert">{t(errors.root.server.message)}</p>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-white/90" htmlFor="login-email">{t("Email address")}</label>
          <input
            autoComplete="email"
            className="h-11 w-full rounded-sm border border-white/20 bg-[#230c5d] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-yellow-200"
            id="login-email"
            type="email"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
          />
          {errors.email?.message && <p className="mt-1 text-xs text-rose-200" id="login-email-error">{t(errors.email.message)}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-white/90" htmlFor="login-password">{t("Password")}</label>
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-sm border border-white/20 bg-[#230c5d] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-yellow-200"
            id="login-password"
            type="password"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
          />
          {errors.password?.message && <p className="mt-1 text-xs text-rose-200" id="login-password-error">{t(errors.password.message)}</p>}
        </div>
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-yellow-300 px-4 text-sm font-extrabold text-[#24103f] transition hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-100 disabled:cursor-wait disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t("Signing in…") : t("Log in")}
        </button>
      </form>
    </AuthLayout>
  );
}
