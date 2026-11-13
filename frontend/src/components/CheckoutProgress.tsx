import { Check } from "lucide-react";
import { useTranslation } from "../i18n";

const steps = [
  "Checkout",
  "Order review",
  "Order confirmation",
] as const;

export function CheckoutProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  const { t } = useTranslation();

  return (
    <nav aria-label={t("Checkout progress")} className="mb-6">
      <ol className="grid grid-cols-3">
        {steps.map((step, index) => {
          const number = index + 1;
          const complete = number < currentStep;
          const active = number === currentStep;

          return (
            <li className="relative flex min-w-0 flex-col items-center text-center" key={step}>
              {number < steps.length && (
                <span
                  aria-hidden="true"
                  className={`absolute left-1/2 top-4 h-0.5 w-full ${complete ? "bg-yellow-200" : "bg-white/15"}`}
                />
              )}
              <span
                aria-current={active ? "step" : undefined}
                className={`relative z-10 grid size-8 place-items-center rounded-full border text-sm font-bold ${
                  complete
                    ? "border-yellow-200 bg-yellow-200 text-[#24103f]"
                    : active
                      ? "border-yellow-200 bg-[#351078] text-yellow-100 ring-4 ring-yellow-200/15"
                      : "border-white/25 bg-[#351078] text-white/55"
                }`}
              >
                {complete ? <Check aria-hidden="true" size={16} /> : number}
              </span>
              <span className={`mt-2 px-1 text-[11px] font-semibold leading-tight sm:text-sm ${active || complete ? "text-yellow-100" : "text-white/55"}`}>
                {t(step)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
