import { AnimatePresence, motion } from 'motion/react'

export function TextMorph({ children, as: Tag = 'span', className = '' }) {
  return (
    <Tag className={className} style={{ position: 'relative', display: 'inline-block' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={children}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.25 }}
          style={{ display: 'inline-block' }}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </Tag>
  )
}
