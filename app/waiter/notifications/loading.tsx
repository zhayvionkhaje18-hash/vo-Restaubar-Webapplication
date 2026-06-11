import { Card, CardContent } from "@/components/ui/card"

export default function WaiterNotificationsLoading() {
  return (
    <div className="space-y-6">
      {/* Alert banner skeleton */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="size-12 animate-pulse rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-64 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>

      {/* Active orders skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="size-2 animate-pulse rounded-full bg-muted" />
                <div className="space-y-1">
                  <div className="h-4 w-16 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted/40" />
                </div>
              </div>
              <div className="h-7 w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 p-3">
              <div className="size-4 animate-pulse rounded bg-muted mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
                  <div className="h-3 w-16 animate-pulse rounded bg-muted/40" />
                </div>
                <div className="h-3 w-48 animate-pulse rounded bg-muted/40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}