import { useState, useEffect } from 'react'

/**
 * useReducedMotion hook (per accessible-animation skill)
 * Safely reads window.matchMedia('(prefers-reduced-motion: reduce)')
 * and listens to live OS-level preference toggles.
 * Defaults to false during initial render to prevent SSR/hydration mismatch.
 */
export function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const get = () =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false

  const [reduced, setReduced] = useState(get)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mq = window.matchMedia(query)
    const onChange = () => setReduced(mq.matches)
    
    // Sync immediately on mount
    onChange()

    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
