import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react"

const ACCENT_BG: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendUp,
  accent,
}: {
  label: string
  value: string
  icon: LucideIcon
  subtitle?: string
  trend?: string
  trendUp?: boolean
  accent?: "emerald" | "blue" | "amber" | "purple" | "rose"
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {(subtitle || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-medium",
                    trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {trendUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {trend}
                </span>
              )}
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent ? ACCENT_BG[accent] : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  )
}
