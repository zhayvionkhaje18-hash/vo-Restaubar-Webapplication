export default function WaiterNotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
        ))}
      </div>
    </div>
  )
}