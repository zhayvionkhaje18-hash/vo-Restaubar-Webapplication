import Link from "next/link"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

export interface Crumb {
  label: string
  href?: string
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  className,
}: {
  title: string
  description?: string
  crumbs?: Crumb[]
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        {crumbs && crumbs.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1 text-xs font-medium text-muted-foreground">
            {crumbs.map((crumb, idx) => {
              const isLast = idx === crumbs.length - 1
              return (
                <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(isLast && "text-foreground/80")}>{crumb.label}</span>
                  )}
                  {!isLast && <ChevronRight className="size-3 opacity-50" />}
                </span>
              )
            })}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.7rem]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
