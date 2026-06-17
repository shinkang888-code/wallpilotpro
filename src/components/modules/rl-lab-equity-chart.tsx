import type { TmEquityPoint } from "@/lib/modules/tm/types";
import { cn } from "@/lib/utils";

export function RlLabEquityChart({
  curve,
  className,
}: {
  curve: TmEquityPoint[];
  className?: string;
}) {
  if (curve.length < 2) return null;

  const values = curve.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const last = values[values.length - 1];
  const first = values[0];
  const up = last >= first;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-36 items-end gap-px rounded-xl border border-hairline bg-gradient-to-t from-muted/30 to-transparent p-2">
        {curve.map((point, idx) => {
          const h = ((point.value - min) / range) * 100;
          const isLast = idx === curve.length - 1;
          return (
            <div
              key={point.date}
              title={`${point.date}: ${point.value.toLocaleString()}`}
              className={cn(
                "min-w-[3px] flex-1 rounded-t transition-all duration-300",
                up ? "bg-positive/80" : "bg-destructive/70",
                isLast && "ring-1 ring-foreground/20",
              )}
              style={{ height: `${Math.max(h, 6)}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{curve[0].date}</span>
        <span>{curve[curve.length - 1].date}</span>
      </div>
    </div>
  );
}
