import Link from "next/link"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MailCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-b from-muted/40 to-background p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center space-y-3">
          <Brand className="justify-center" />
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <MailCheck className="size-6" />
          </div>
          <div>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We sent a confirmation link to your email. Confirm it to activate your account, then sign in.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Go to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
