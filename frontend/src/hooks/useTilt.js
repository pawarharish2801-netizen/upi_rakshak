import { useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useReducedMotion } from './useReducedMotion'

/**
 * Spatial Tilt Hook with Tier-1 Reduced Motion Gating
 * (Combines antigravity-design-expert with accessible-animation)
 * If the user prefers reduced motion, 3D tilt angles are locked to 0.
 */
export function useSpatialTilt({
  maxTilt = 10,
  stiffness = 250,
  damping = 25,
} = {}) {
  const isReduced = useReducedMotion()

  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)

  const springConfig = { stiffness, damping }
  const smoothX = useSpring(x, springConfig)
  const smoothY = useSpring(y, springConfig)

  // Tier 1: Disable 3D displacement under reduced motion
  const effectiveTilt = isReduced ? 0 : maxTilt

  const rotateX = useTransform(smoothY, [0, 1], [effectiveTilt, -effectiveTilt])
  const rotateY = useTransform(smoothX, [0, 1], [-effectiveTilt, effectiveTilt])

  const glareX = useTransform(smoothX, [0, 1], [0, 100])
  const glareY = useTransform(smoothY, [0, 1], [0, 100])

  const onMouseMove = (e) => {
    if (isReduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    const newX = (e.clientX - rect.left) / rect.width
    const newY = (e.clientY - rect.top) / rect.height
    x.set(newX)
    y.set(newY)
  }

  const onMouseLeave = () => {
    x.set(0.5)
    y.set(0.5)
  }

  return {
    rotateX,
    rotateY,
    glareX,
    glareY,
    onMouseMove,
    onMouseLeave,
    isReduced,
  }
}
