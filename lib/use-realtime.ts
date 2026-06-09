"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Subscribes to Postgres changes on the given tables and invokes the callback
 * (typically an SWR mutate) whenever any change occurs.
 */
export function useRealtime(tables: string[], onChange: () => void) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`realtime-${tables.join("-")}-${Math.random().toString(36).slice(2)}`)

    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        onChange()
      })
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(",")])
}
