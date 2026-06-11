import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function WaiterOrdersLoading() {
  return (
    <div className="space-y-6">
      {/* Search skeleton */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 max-w-sm animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1">
        <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="h-40 animate-pulse bg-muted/30 p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-5 w-20 animate-pulse rounded bg-muted/60" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted/40" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-muted/60" />
                </div>
                <div className="space-y-1.5 pt-2">
                  <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-muted/40" />
                </div>
                <div className="h-8 w-full animate-pulse rounded bg-muted/40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}