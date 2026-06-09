import Link from "next/link"
import Image from "next/image"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { RESTAURANT_NAME } from "@/lib/constants"
import {
  LayoutDashboard,
  ScanLine,
  Receipt,
  CalendarClock,
  Utensils,
  Activity,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Admin Command Center",
    desc: "Live revenue, covers, and order analytics with full control over menu, tables, and staff.",
  },
  {
    icon: ScanLine,
    title: "QR Self-Ordering",
    desc: "Guests scan a table QR to browse the menu and order directly from their phone.",
  },
  {
    icon: Receipt,
    title: "Integrated POS & Payments",
    desc: "Cashiers process cash, card, and e-wallet payments and issue digital receipts instantly.",
  },
  {
    icon: Utensils,
    title: "Waiter Floor App",
    desc: "Servers manage assigned tables, fire orders to the kitchen, and track readiness in real time.",
  },
  {
    icon: CalendarClock,
    title: "Reservations",
    desc: "Capture bookings, assign tables, and manage the seating pipeline from one place.",
  },
  {
    icon: Activity,
    title: "Real-Time Sync",
    desc: "Every order, payment, and table change streams live across all devices and roles.",
  },
]

const STATS = [
  { value: "4", label: "Role-based consoles" },
  { value: "100%", label: "Real-time updates" },
  { value: "<2s", label: "Order to kitchen" },
  { value: "24/7", label: "Operations ready" },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Brand showTagline={false} />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/hero-restaurant.png"
              alt="Upscale restaurant and bar interior"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          </div>
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:py-28">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <ShieldCheck className="size-3.5 text-primary" />
                Enterprise restaurant &amp; bar operations
              </span>
              <h1 className="mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-6xl">
                Run your entire floor, bar, and kitchen from one platform
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                {RESTAURANT_NAME} unifies QR self-ordering, point-of-sale, waiter coordination, payments,
                reservations, and analytics — built for high-volume hospitality.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/login">
                    Open staff console
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/menu">Try guest QR ordering</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 py-2 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="px-4 py-6 text-center">
                <div className="text-3xl font-semibold tracking-tight text-foreground">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              One system for every role on your team
            </h2>
            <p className="mt-3 text-pretty text-muted-foreground">
              Purpose-built consoles for administrators, cashiers, and waiters — plus a frictionless guest ordering
              experience.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-medium text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-sidebar p-10 md:p-14">
            <div className="max-w-xl">
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-sidebar-foreground">
                Ready to modernize your operations?
              </h2>
              <p className="mt-3 text-pretty text-sidebar-foreground/70">
                Spin up an admin account, configure your menu and tables, and start taking orders in minutes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/signup">Create admin account</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
                  asChild
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground md:flex-row">
          <Brand showTagline={false} />
          <p>{`© ${new Date().getFullYear()} ${RESTAURANT_NAME} Restaurant & Bar. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  )
}
