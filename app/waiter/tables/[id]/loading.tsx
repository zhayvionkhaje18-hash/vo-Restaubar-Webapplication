export default function WaiterTableLoading() {
  return (
    <div className="space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}