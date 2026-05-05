"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { apiClient } from "@/lib/api/client"

function getSessionId(): string {
  if (typeof window === "undefined") return ""

  const key = "dht_session_id"
  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem(key, sessionId)
  }
  return sessionId
}

export function usePageViewTracker() {
  const pathname = usePathname()
  const lastTracked = useRef<string>("")

  useEffect(() => {
    if (pathname === lastTracked.current) return
    lastTracked.current = pathname

    const trackPageView = async () => {
      try {
        await apiClient.post("/v1/analytics/pageview", {
          path: pathname,
          referrer: document.referrer || null,
          sessionId: getSessionId(),
        })
      } catch {
        // Silently fail — analytics must not break the UI
      }
    }

    // Debounce to avoid double-firing from React strict mode
    const timeout = setTimeout(trackPageView, 300)
    return () => clearTimeout(timeout)
  }, [pathname])
}
