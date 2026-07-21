import { useCallback, useEffect, useRef, useState } from 'react'

export const SECRET_MASK = '••••••••'

export const SECRET_REVEAL_TIMEOUT_MS = 30_000

export function useTimedSecretReveals() {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const hide = useCallback((key: string) => {
    const timer = timers.current.get(key)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.current.delete(key)
    }
    setRevealedKeys((previous) => {
      if (!previous.has(key)) return previous
      const next = new Set(previous)
      next.delete(key)
      return next
    })
  }, [])

  const reveal = useCallback((key: string) => {
    const previousTimer = timers.current.get(key)
    if (previousTimer !== undefined) clearTimeout(previousTimer)

    setRevealedKeys((previous) => new Set(previous).add(key))
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key)
        setRevealedKeys((previous) => {
          const next = new Set(previous)
          next.delete(key)
          return next
        })
      }, SECRET_REVEAL_TIMEOUT_MS),
    )
  }, [])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer)
      activeTimers.clear()
    }
  }, [])

  return { revealedKeys, reveal, hide }
}
