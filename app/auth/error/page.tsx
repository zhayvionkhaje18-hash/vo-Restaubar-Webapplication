import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <Brand />
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Authentication error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while signing you in. The link may have expired or already been used.
        </p>
      </div>
      <Button asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
    </main>
  )
}
