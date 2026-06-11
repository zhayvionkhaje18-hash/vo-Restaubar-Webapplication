export default function WaiterOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-80 animate-pulse rounded-md bg-muted" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}