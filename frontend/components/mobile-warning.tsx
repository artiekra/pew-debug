"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

export function MobileWarning() {
  const [show, setShow] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const dismissed = localStorage.getItem("mobile-warning-dismissed")
    if (dismissed === "true") return

    // Simple mobile detection by screen width and user agent
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    const isSmallScreen = window.innerWidth <= 768

    if (isMobileDevice || isSmallScreen) {
      setShow(true)
    }
  }, [])

  if (!isMounted) return null

  const handleDismiss = () => {
    localStorage.setItem("mobile-warning-dismissed", "true")
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
          >
            {/* Ambient glow */}
            <div className="pointer-events-none absolute top-0 left-1/2 h-32 w-full -translate-x-1/2 rounded-full bg-amber-500/10 blur-[50px]" />

            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 z-10 text-neutral-400 transition-colors hover:text-white"
              aria-label="Dismiss warning"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 shadow-inner">
                <AlertTriangle className="h-7 w-7 text-amber-500" />
              </div>

              <div className="space-y-2">
                <h2 className="font-heading text-xl font-semibold tracking-tight text-white">
                  Mobile Not Supported
                </h2>
                <p className="text-sm leading-relaxed text-neutral-400">
                  This debugging interface is heavily optimized for desktop
                  screens. You will likely experience layout issues or broken
                  functionality on mobile devices.
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="mt-4 w-full rounded-xl bg-white py-2.5 font-medium text-neutral-950 transition-colors hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none active:scale-[0.98]"
              >
                I understand, proceed anyway
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
