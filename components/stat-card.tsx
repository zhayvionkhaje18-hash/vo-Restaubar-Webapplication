import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  label: string
  value: string
  icon: LucideIcon
  hint?: string
  accent?: boolean
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  )
}
