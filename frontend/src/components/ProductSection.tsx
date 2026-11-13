import type { ReactNode } from "react";

interface ProductSectionProps {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function ProductSection({ id, title, subtitle, children }: ProductSectionProps) {
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="scroll-mt-32">
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl" id={`${id}-heading`}>
            {title}
          </h2>
          <p className="mt-1 text-xs text-white/70 sm:text-sm">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
