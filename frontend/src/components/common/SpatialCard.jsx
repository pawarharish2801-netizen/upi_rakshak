import { motion } from 'framer-motion'
import { useSpatialTilt } from '../../hooks/useTilt'

/**
 * SpatialCard component (Antigravity Design Expert pattern)
 * Renders an interactive 3D card with spatial depth, weightlessness,
 * and mouse-following perspective transforms.
 */
export function SpatialCard({
  children,
  className = '',
  maxTilt = 8,
  glare = true,
  dark = false,
  ...props
}) {
  const { rotateX, rotateY, onMouseMove, onMouseLeave } = useSpatialTilt({
    maxTilt,
  })

  return (
    <div
      className="perspective-1000 transform-style-3d"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative rounded-2xl transition-shadow duration-300 ${
          dark
            ? 'glass-panel-dark text-white'
            : 'card-weightless text-[var(--color-content-primary)]'
        } ${className}`}
      >
        <div style={{ transform: 'translateZ(20px)' }} className="relative z-10">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
