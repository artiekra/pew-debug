import { Geist, Geist_Mono, JetBrains_Mono, Manrope } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { TourProvider } from "@/components/tour"
import { MobileWarning } from "@/components/mobile-warning"

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
})

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "dark antialiased",
        fontSans.variable,
        "font-sans",
        jetbrainsMono.variable,
        manropeHeading.variable
      )}
    >
      <body className="min-h-screen bg-neutral-950 font-sans text-neutral-50 selection:bg-primary/30">
        <ThemeProvider forcedTheme="dark">
          <TourProvider>
            {children}
            <MobileWarning />
          </TourProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
