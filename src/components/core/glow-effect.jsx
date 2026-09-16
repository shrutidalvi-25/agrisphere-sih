import { motion } from 'motion/react'

const BLUR_CLASSES = {
  softest: 'blur-sm',
  soft: 'blur',
  medium: 'blur-md',
  strong: 'blur-lg',
  stronger: 'blur-xl',
  strongest: 'blur-2xl',
  none: 'blur-none',
}

export function GlowEffect({
  className = '',
  style,
  colors = ['#b8860b', '#3c7f20', '#4c9a2a', '#c9972e'],
  mode = 'rotate',
  blur = 'medium',
  transition,
  scale = 1,
  duration = 5,
}) {
  const baseTransition = { repeat: Infinity, duration, ease: 'linear' }

  const animations = {
    rotate: {
      background: [
        `conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')})`,
        `conic-gradient(from 360deg at 50% 50%, ${colors.join(', ')})`,
      ],
      transition: transition ?? baseTransition,
    },
    colorShift: {
      background: colors.map((color, i) => {
        const next = colors[(i + 1) % colors.length]
        return `conic-gradient(from 0deg at 50% 50%, ${color} 0%, ${next} 50%, ${color} 100%)`
      }),
      transition: transition ?? { ...baseTransition, repeatType: 'mirror' },
    },
    pulse: {
      background: colors.map((color) => `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 100%)`),
      scale: [1 * scale, 1.1 * scale, 1 * scale],
      opacity: [0.5, 0.8, 0.5],
      transition: transition ?? { ...baseTransition, repeatType: 'mirror' },
    },
    static: {
      background: `linear-gradient(to right, ${colors.join(', ')})`,
    },
  }

  const blurClass = typeof blur === 'number' ? '' : BLUR_CLASSES[blur] || BLUR_CLASSES.medium
  const blurStyle = typeof blur === 'number' ? { filter: `blur(${blur}px)` } : undefined

  return (
    <motion.div
      style={{ ...style, ...blurStyle, willChange: 'transform', backfaceVisibility: 'hidden' }}
      className={`pointer-events-none absolute inset-0 h-full w-full ${blurClass} ${className}`.trim()}
      animate={animations[mode] || animations.rotate}
    />
  )
}
