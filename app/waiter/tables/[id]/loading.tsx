import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function WaiterTableLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="animate-pulse bg-muted" />
        <div className="space-y-1">
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted/60" />
        </div>
        <Button variant="outline" size="sm" className="ml-auto animate-pulse bg-muted" />
      </div>

      {/* Order cards skeleton */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="h-6 w-20 animate-pulse rounded bg-muted/60" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted/40" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-muted/60" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="h-4 w-48 animate-pulse rounded bg-muted/40" />
                    <div className="h-4 w-16 animate-pulse rounded bg-muted/40" />
                  </div>
                ))}
              </div>
              <div className="h-9 w-full animate-pulse rounded-md bg-muted/40" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}