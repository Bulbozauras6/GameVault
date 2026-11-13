import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { useTranslation } from "../i18n";

interface ProductRailProps {
  label: string;
  children: ReactNode;
}

export function ProductRail({ label, children }: ProductRailProps) {
  const { t } = useTranslation();
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    railRef.current?.scrollBy({
      left: direction * Math.max(railRef.current.clientWidth * 0.78, 280),
      behavior: "smooth",
    });
  }

  return (
    <div className="group/rail relative">
      <button
        aria-label={t("Scroll {label} left", { label })}
        className="absolute -left-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#2a2840] text-white shadow-xl transition hover:bg-yellow-300 hover:text-[#17132b] md:grid md:opacity-0 md:group-hover/rail:opacity-100"
        onClick={() => scroll(-1)}
        type="button"
      >
        <ChevronLeft size={18} />
      </button>
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
        ref={railRef}
      >
        {children}
      </div>
      <button
        aria-label={t("Scroll {label} right", { label })}
        className="absolute -right-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-[#2a2840] text-white shadow-xl transition hover:bg-yellow-300 hover:text-[#17132b] md:grid md:opacity-0 md:group-hover/rail:opacity-100"
        onClick={() => scroll(1)}
        type="button"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
