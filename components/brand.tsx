import { cn } from "@/lib/utils"
import { RESTAURANT_NAME, RESTAURANT_TAGLINE } from "@/lib/constants"

export function BrandMark({ className, logoUrl }: { className?: string; logoUrl?: string | null }) {
  return (
    <div
      className={cn(
        "flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Logo" className="size-full object-contain" />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 3v7a3 3 0 0 0 6 0V3M8 10v11" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 3c-1.5 1-2.5 3-2.5 6s1 4 2.5 4v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export function Brand({
  className,
  variant = "default",
  showTagline = true,
  name,
  tagline,
  logoUrl,
}: {
  className?: string
  variant?: "default" | "sidebar"
  showTagline?: boolean
  name?: string
  tagline?: string
  logoUrl?: string | null
}) {
  const displayName = name ?? RESTAURANT_NAME
  const displayTagline = tagline ?? RESTAURANT_TAGLINE

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark logoUrl={logoUrl} />
      <div className="leading-tight">
        <div
          className={cn(
            "font-semibold tracking-tight",
            variant === "sidebar" ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          {displayName}
        </div>
        {showTagline && (
          <div
            className={cn(
              "text-xs",
              variant === "sidebar" ? "text-sidebar-foreground/60" : "text-muted-foreground",
            )}
          >
            {displayTagline}
          </div>
        )}
      </div>
    </div>
  )
}
