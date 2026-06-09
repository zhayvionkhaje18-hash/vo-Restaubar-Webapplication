import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSessionProfile } from "@/lib/auth"
import { ROLE_HOME } from "@/lib/constants"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const profile = await getSessionProfile()
  if (profile) redirect(ROLE_HOME[profile.role] ?? "/")

  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-muted/40 to-background p-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
