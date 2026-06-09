import { cn } from "@/lib/utils"
import { RESTAURANT_NAME, RESTAURANT_TAGLINE } from "@/lib/constants"

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 3v7a3 3 0 0 0 6 0V3M8 10v11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 3c-1.5 1-2.5 3-2.5 6s1 4 2.5 4v8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function Brand({
  className,
  variant = "default",
  showTagline = true,
}: {
  className?: string
  variant?: "default" | "sidebar"
  showTagline?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark />
      <div className="leading-tight">
        <div
          className={cn(
            "font-semibold tracking-tight",
            variant === "sidebar" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          {RESTAURANT_NAME}
        </div>
        {showTagline && (
          <div
            className={cn(
              "text-xs",
              variant === "sidebar" ? "text-sidebar-foreground/60" : "text-muted-foreground",
            )}
          >
            {RESTAURANT_TAGLINE}
          </div>
        )}
      </div>
    </div>
  )
}
