import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { getAuthApiError } from "../api/authErrors";
import { AuthLayout } from "../components/AuthLayout";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../stores/authStore";

const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(255, "Name must be 255 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  password_confirmation: z.string().min(1, "Confirm your password."),
}).refine((values) => values.password === values.password_confirmation, {
  message: "Passwords do not match.",
  path: ["password_confirmation"],
});

type RegistrationValues = z.infer<typeof registrationSchema>;
type RegistrationField = keyof RegistrationValues;

const registrationFields: RegistrationField[] = ["name", "email", "password", "password_confirmation"];

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { from?: string } | null)?.from;
  const intendedPath = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const registerAccount = useAuthStore((state) => state.register);
  const clearError = useAuthStore((state) => state.clearError);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", email: "", password: "", password_confirmation: "" },
  });

  async function submit(values: RegistrationValues) {
    clearError();
    try {
      await registerAccount(values);
      navigate(intendedPath, { replace: true });
    } catch (error) {
      const apiError = getAuthApiError(error);
      let matchedFieldError = false;

      for (const field of registrationFields) {
        const message = apiError.errors?.[field]?.[0];
        if (message) {
          setError(field, { type: "server", message });
          matchedFieldError = true;
        }
      }

      if (!matchedFieldError) {
        setError("root.server", { type: "server", message: apiError.message });
      }
    }
  }

  return (
    <AuthLayout
      description={t(intendedPath.startsWith("/checkout")
        ? "Create an account to finish checkout. Your cart will be kept."
        : "Create an account to make your GameVault experience yours.")}
      footer={<>{t("Already have an account?")} <Link className="font-bold text-yellow-200 hover:text-white" state={location.state} to="/login">{t("Log in")}</Link></>}
      title={t("Create your account")}
    >
      <form className="space-y-3.5" noValidate onSubmit={handleSubmit(submit)}>
        {errors.root?.server?.message && (
          <p className="border border-rose-200/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100" role="alert">{t(errors.root.server.message)}</p>
        )}
        <RegistrationField
          autoComplete="name"
          error={errors.name?.message}
          id="register-name"
          label={t("Name")}
          registration={register("name")}
        />
        <RegistrationField
          autoComplete="email"
          error={errors.email?.message}
          id="register-email"
          label={t("Email address")}
          registration={register("email")}
          type="email"
        />
        <RegistrationField
          autoComplete="new-password"
          error={errors.password?.message}
          id="register-password"
          label={t("Password")}
          registration={register("password")}
          type="password"
        />
        <RegistrationField
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          id="register-password-confirmation"
          label={t("Confirm password")}
          registration={register("password_confirmation")}
          type="password"
        />
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-yellow-300 px-4 text-sm font-extrabold text-[#24103f] transition hover:bg-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-100 disabled:cursor-wait disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t("Creating account…") : t("Create account")}
        </button>
      </form>
    </AuthLayout>
  );
}

function RegistrationField({
  autoComplete,
  error,
  id,
  label,
  registration,
  type = "text",
}: {
  autoComplete: string;
  error?: string;
  id: string;
  label: string;
  registration: ReturnType<ReturnType<typeof useForm<RegistrationValues>>["register"]>;
  type?: string;
}) {
  const { t } = useTranslation();
  const errorId = `${id}-error`;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-white/90" htmlFor={id}>{label}</label>
      <input
        autoComplete={autoComplete}
        className="h-10 w-full rounded-sm border border-white/20 bg-[#230c5d] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-yellow-200"
        id={id}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...registration}
      />
      {error && <p className="mt-1 text-xs text-rose-200" id={errorId}>{t(error)}</p>}
    </div>
  );
}
