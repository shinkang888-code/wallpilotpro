import { cn } from "@/lib/utils";
import type { PortfolioRating } from "@/lib/types/rating";

const STYLES: Record<PortfolioRating, string> = {
  Buy: "bg-emerald-50 text-positive border-emerald-200",
  Overweight: "bg-sky-50 text-sky-700 border-sky-200",
  Hold: "bg-amber-50 text-amber-800 border-amber-200",
  Underweight: "bg-orange-50 text-orange-700 border-orange-200",
  Sell: "bg-red-50 text-destructive border-red-200",
};

export function RatingBadge({
  rating,
  className,
}: {
  rating: PortfolioRating;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STYLES[rating],
        className,
      )}
    >
      {rating}
    </span>
  );
}
