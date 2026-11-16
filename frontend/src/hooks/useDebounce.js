import { useState, useEffect } from 'react'

/**
 * useDebounce hook per cc-skill-frontend-patterns
 * Delays updating the debounced value until specified delay has elapsed.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
