import { Suspense } from "react"
import { PlayClient } from "@/components/play/play-client"
import { RESTAURANT_NAME } from "@/lib/constants"

export const dynamic = "force-dynamic"

export const metadata = {
  title: `Play · ${RESTAURANT_NAME}`,
  description: "Mini games to enjoy while you wait for your order.",
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        </div>
      }
    >
      <PlayClient />
    </Suspense>
  )
}
