import { useEffect, useState } from 'react'
import { motion, useSpring } from 'framer-motion'
import { ShieldCheck, WarningCircle, Warning, XCircle } from '@phosphor-icons/react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

export function RiskMeter({ score = 0, level = 'Low', size = 'lg', showDetails = true }) {
  const isReduced = useReducedMotion()

  const config = {
    Low: {
      stroke: '#059669',
      glow: 'rgba(5, 150, 105, 0.25)',
      bgSoft: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      label: 'Low Risk',
      icon: ShieldCheck,
      desc: 'Normal behavioral pattern. Proceed with standard UPI vigilance.',
    },
    Medium: {
      stroke: '#d97706',
      glow: 'rgba(217, 119, 6, 0.25)',
      bgSoft: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Medium Risk',
      icon: WarningCircle,
      desc: 'Unusual patterns detected (e.g. first-time contact, urgency claim). Verify beneficiary before authorizing.',
    },
    High: {
      stroke: '#e11d48',
      glow: 'rgba(225, 29, 72, 0.25)',
      bgSoft: 'bg-rose-50 text-rose-800 border-rose-200',
      label: 'High Risk',
      icon: Warning,
      desc: 'Multiple active social engineering vectors identified. Significant likelihood of UPI fraud.',
    },
    Critical: {
      stroke: '#881337',
      glow: 'rgba(136, 19, 55, 0.35)',
      bgSoft: 'bg-rose-100 text-rose-950 border-rose-300',
      label: 'Critical Risk',
      icon: XCircle,
      desc: 'High-confidence scam pattern (PIN to receive / remote access app / digital arrest impersonation). DO NOT PROCEED.',
    },
  }

  const meta = config[level] || config.Low
  const Icon = meta.icon

  const radius = size === 'lg' ? 76 : 50
  const strokeWidth = size === 'lg' ? 12 : 8
  const circumference = 2 * Math.PI * radius
  const normalizedScore = Math.min(100, Math.max(0, score))
  const arcLength = circumference * (240 / 360)
  const strokeDashoffset = arcLength - (arcLength * normalizedScore) / 100

  // Tiered Animation: Soften counter for reduced motion users
  const springScore = useSpring(0, {
    stiffness: isReduced ? 300 : 60,
    damping: isReduced ? 40 : 20,
  })
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    springScore.set(normalizedScore)
    const unsubscribe = springScore.on('change', (latest) => {
      setDisplayScore(Math.round(latest))
    })
    return () => unsubscribe()
  }, [normalizedScore, springScore])

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center p-2">
        {/* Soft diffused glow ring */}
        <div
          className={`absolute inset-4 rounded-full blur-2xl transition-colors duration-500 ${
            isReduced ? 'opacity-20' : 'opacity-40'
          }`}
          style={{ backgroundColor: meta.glow }}
        />

        <svg
          className="transform -rotate-90 relative z-10"
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
        >
          {/* Background Track */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Spatial Dynamic Fill */}
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="transparent"
            stroke={meta.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: isReduced ? strokeDashoffset : arcLength }}
            animate={{ strokeDashoffset }}
            transition={
              isReduced
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 70, damping: 18 }
            }
          />
        </svg>

        {/* Center spatial badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <span className="text-4xl font-extrabold tracking-tight font-data text-[var(--color-content-primary)]">
            {isReduced ? normalizedScore : displayScore}
          </span>
          <span className="text-[10px] uppercase font-semibold text-[var(--color-content-tertiary)] tracking-widest mt-0.5">
            Risk Score
          </span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 text-center space-y-2 max-w-[300px]">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-sm ${meta.bgSoft}`}
          >
            <Icon size={15} weight="bold" />
            <span>{meta.label}</span>
          </div>
          <p className="text-xs text-[var(--color-content-secondary)] leading-relaxed">
            {meta.desc}
          </p>
        </div>
      )}
    </div>
  )
}
