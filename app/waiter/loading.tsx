import { Card, CardContent } from "@/components/ui/card"

export default function WaiterDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="size-11 animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-muted/60" />
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid skeleton */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted/60" />
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="h-32 animate-pulse bg-muted/30" />
            </Card>
          ))}
        </div>
        <div className="lg:col-span-3 space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted/60" />
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="h-28 animate-pulse bg-muted/30" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}