"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ROLE_HOME } from "@/lib/constants"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import type { UserRole } from "@/lib/types"

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@lumiere.app" },
  { role: "POS / Cashier", email: "pos@lumiere.app" },
  { role: "Waiter", email: "waiter@lumiere.app" },
]

function isUserRole(v: unknown): v is UserRole {
  return v === "admin" || v === "pos" || v === "waiter"
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      console.error("[login] signInWithPassword failed:", signInError)
      setError(signInError.message)
      setLoading(false)
      return
    }

    const user = data.user
    // Read role from auth metadata (set by /signup). If missing or invalid,
    // the destination layout will self-heal via getSessionProfile() -> ensure_profile().
    const metaRole = user?.user_metadata?.role
    const role: UserRole = isUserRole(metaRole) ? metaRole : "waiter"

    // Priority: explicit ?next= param (e.g. /admin bounced us here),
    // otherwise route by the role captured at signup.
    const dest = next || ROLE_HOME[role] || "/"

    console.log("[login] success", {
      userId: user?.id,
      email: user?.email,
      metaRole,
      resolvedRole: role,
      dest,
    })

    router.push(dest)
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-border/60 shadow-xl shadow-black/5">
      <CardHeader className="space-y-3">
        <Brand className="mb-2" />
        <div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to the staff operations console.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@lumiere.app"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">Demo accounts (create them on the sign-up page)</p>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{a.role}</span>
                <button
                  type="button"
                  className="font-mono text-foreground hover:text-primary"
                  onClick={() => setEmail(a.email)}
                >
                  {a.email}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New team member?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
