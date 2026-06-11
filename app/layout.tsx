import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { PwaRegister } from "@/components/pwa-register"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Lumière — Restaurant & Bar Management System",
  description:
    "An end-to-end restaurant and bar operations platform: POS, table & QR ordering, kitchen routing, payments, reservations, and real-time analytics.",
  generator: "v0.app",
  manifest: "/manifest.json",
  applicationName: "Lumière",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lumière",
  },
  openGraph: {
    type: "website",
    siteName: "Lumière",
    title: "Lumière — Restaurant & Bar Management System",
    description:
      "Restaurant & bar operations platform: POS, table orders, payments, reservations.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
    other: [
      {
        url: "/apple-icon.png",
        rel: "apple-touch-icon",
        sizes: "180x180",
      },
      {
        url: "/icon-192x192.png",
        rel: "icon",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lumière" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <PwaRegister />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}