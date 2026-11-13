import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ClipboardList, KeyRound, ShoppingCart, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { getAuthApiError } from "../api/authErrors";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../stores/authStore";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(255, "Name must be 255 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address.").max(255, "Email must be 255 characters or fewer."),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, "Enter your current password."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  password_confirmation: z.string().min(1, "Confirm your new password."),
}).refine((values) => values.password === values.password_confirmation, {
  message: "Passwords do not match.",
  path: ["password_confirmation"],
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const profileFields: Array<keyof ProfileValues> = ["name", "email"];
const passwordFields: Array<keyof PasswordValues> = ["current_password", "password", "password_confirmation"];

export function AccountPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const changePassword = useAuthStore((state) => state.changePassword);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });

  async function saveProfile(values: ProfileValues) {
    setProfileSaved(false);
    profileForm.clearErrors();

    try {
      await updateProfile(values);
      profileForm.reset(values);
      setProfileSaved(true);
    } catch (error) {
      const apiError = getAuthApiError(error);
      let hasFieldErrors = false;

      for (const field of profileFields) {
        const message = apiError.errors?.[field]?.[0];
        if (message) {
          profileForm.setError(field, { type: "server", message });
          hasFieldErrors = true;
        }
      }

      if (!hasFieldErrors) {
        profileForm.setError("root.server", { type: "server", message: apiError.message });
      }
    }
  }

  async function savePassword(values: PasswordValues) {
    setPasswordChanged(false);
    passwordForm.clearErrors();

    try {
      await changePassword(values);
      passwordForm.reset();
      setPasswordChanged(true);
    } catch (error) {
      const apiError = getAuthApiError(error);
      let hasFieldErrors = false;

      for (const field of passwordFields) {
        const message = apiError.errors?.[field]?.[0];
        if (message) {
          passwordForm.setError(field, { type: "server", message });
          hasFieldErrors = true;
        }
      }

      if (!hasFieldErrors) {
        passwordForm.setError("root.server", { type: "server", message: apiError.message });
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#4b0caf] text-white">
      <AccountPageHeader />
      <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <Link className="inline-flex items-center gap-2 text-xs font-bold text-white/75 hover:text-white" to="/">
          <ArrowLeft size={15} /> {t("Continue shopping")}
        </Link>

        <div className="mt-4">
          <p className="text-2xs font-bold uppercase tracking-[0.16em] text-yellow-200">{t("Your GameVault profile")}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("Account settings")}</h1>
          <p className="mt-2 text-sm text-white/70">{t("Manage your profile, password, and purchases.")}</p>
        </div>

        {!user ? (
          <div className="mt-6"><LoadingSpinner centered label={t("Loading account")} size="lg" /></div>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <section aria-labelledby="profile-heading" className="border border-white/15 bg-[#5b1bc2] p-4 sm:p-6">
                <div className="flex items-center gap-3 border-b border-white/15 pb-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-yellow-200/15 text-yellow-100">
                    <UserRound size={21} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold" id="profile-heading">{t("Profile information")}</h2>
                    <p className="truncate text-xs text-white/65">{user.name} · {user.email}</p>
                  </div>
                </div>

                <form className="mt-5 space-y-4" noValidate onSubmit={profileForm.handleSubmit(saveProfile)}>
                  {profileForm.formState.errors.root?.server?.message && (
                    <p className="border border-rose-200/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100" role="alert">
                      {t(profileForm.formState.errors.root.server.message)}
                    </p>
                  )}
                  {profileSaved && (
                    <p className="border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100" role="status">
                      {t("Your profile has been updated.")}
                    </p>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-white/90" htmlFor="account-name">{t("Name")}</label>
                    <input
                      autoComplete="name"
                      aria-describedby={profileForm.formState.errors.name ? "account-name-error" : undefined}
                      aria-invalid={Boolean(profileForm.formState.errors.name)}
                      className="h-11 w-full rounded-sm border border-white/20 bg-[#230c5d] px-3 text-sm text-white outline-none focus:border-yellow-200"
                      id="account-name"
                      {...profileForm.register("name")}
                    />
                    {profileForm.formState.errors.name?.message && (
                      <p className="mt-1 text-xs text-rose-200" id="account-name-error">{t(profileForm.formState.errors.name.message)}</p>
                    )}
                  </div>

                  <div>
                    
                    <input
                      autoComplete="email"
                      aria-describedby={profileForm.formState.errors.email ? "account-email-error" : undefined}
                      aria-invalid={Boolean(profileForm.formState.errors.email)}
                      className="h-11 w-full rounded-sm border border-white/20 bg-[#230c5d] px-3 text-sm text-white outline-none focus:border-yellow-200"
                      id="account-email"
                      type="email"
                      {...profileForm.register("email")}
                    />
                    {profileForm.formState.errors.email?.message && (
                      <p className="mt-1 text-xs text-rose-200" id="account-email-error">{t(profileForm.formState.errors.email.message)}</p>
                    )}
                  </div>

                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-sm bg-yellow-300 px-4 text-sm font-extrabold text-[#24103f] transition hover:bg-yellow-200 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-40"
                    disabled={profileForm.formState.isSubmitting}
                    type="submit"
                  >
                    {profileForm.formState.isSubmitting ? t("Saving profile…") : t("Save changes")}
                  </button>
                </form>
              </section>

              <section aria-labelledby="password-heading" className="border border-white/15 bg-[#5b1bc2] p-4 sm:p-6">
                <div className="flex items-center gap-3 border-b border-white/15 pb-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-yellow-200/15 text-yellow-100">
                    <KeyRound size={21} />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold" id="password-heading">{t("Change password")}</h2>
                    <p className="text-xs text-white/65">{t("Use your current password to confirm this change.")}</p>
                  </div>
                </div>

                <form className="mt-5 space-y-4" noValidate onSubmit={passwordForm.handleSubmit(savePassword)}>
                  {passwordForm.formState.errors.root?.server?.message && (
                    <p className="border border-rose-200/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100" role="alert">
                      {t(passwordForm.formState.errors.root.server.message)}
                    </p>
                  )}
                  {passwordChanged && (
                    <p className="border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100" role="status">
                      {t("Your password has been changed.")}
                    </p>
                  )}

                  <PasswordField
                    autoComplete="current-password"
                    error={passwordForm.formState.errors.current_password?.message}
                    id="account-current-password"
                    label={t("Current password")}
                    registration={passwordForm.register("current_password")}
                  />
                  <PasswordField
                    autoComplete="new-password"
                    error={passwordForm.formState.errors.password?.message}
                    id="account-new-password"
                    label={t("New password")}
                    registration={passwordForm.register("password")}
                  />
                  <PasswordField
                    autoComplete="new-password"
                    error={passwordForm.formState.errors.password_confirmation?.message}
                    id="account-password-confirmation"
                    label={t("Confirm new password")}
                    registration={passwordForm.register("password_confirmation")}
                  />

                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-sm border border-white/25 px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-40"
                    disabled={passwordForm.formState.isSubmitting}
                    type="submit"
                  >
                    {passwordForm.formState.isSubmitting ? t("Updating password…") : t("Update password")}
                  </button>
                </form>
              </section>
            </div>

            <aside aria-label={t("Account navigation")} className="border border-white/15 bg-[#350879] p-4 sm:p-5">
              <h2 className="text-sm font-extrabold">{t("Account navigation")}</h2>
              <nav className="mt-3 space-y-2">
                <Link className="flex items-center gap-3 border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold transition hover:bg-white/10" to="/orders">
                  <ClipboardList className="text-yellow-200" size={18} />
                  {t("Order history")}
                </Link>
                <Link className="flex items-center gap-3 border border-white/10 bg-white/[0.05] px-3 py-3 text-sm font-semibold transition hover:bg-white/10" to="/cart">
                  <ShoppingCart className="text-yellow-200" size={18} />
                  {t("Shopping cart")}
                </Link>
              </nav>
              <p className="mt-4 border-t border-white/15 pt-4 text-xs leading-5 text-white/60">
                {t("You can log out securely from the account control in the header.")}
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

function PasswordField({
  autoComplete,
  error,
  id,
  label,
  registration,
}: {
  autoComplete: string;
  error?: string;
  id: string;
  label: string;
  registration: ReturnType<ReturnType<typeof useForm<PasswordValues>>["register"]>;
}) {
  const { t } = useTranslation();
  const errorId = `${id}-error`;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-white/90" htmlFor={id}>{label}</label>
      <input
        autoComplete={autoComplete}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="h-11 w-full rounded-sm border border-white/20 bg-[#230c5d] px-3 text-sm text-white outline-none focus:border-yellow-200"
        id={id}
        type="password"
        {...registration}
      />
      {error && <p className="mt-1 text-xs text-rose-200" id={errorId}>{t(error)}</p>}
    </div>
  );
}
