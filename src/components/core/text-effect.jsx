import { AnimatePresence, motion } from 'motion/react'

const defaultStaggerTimes = {
  char: 0.03,
  word: 0.05,
  line: 0.1,
}

const defaultContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
}

const defaultItemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const presetVariants = {
  fade: {
    container: defaultContainerVariants,
    item: defaultItemVariants,
  },
  'fade-in-blur': {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: 'blur(8px)', y: 4 },
      visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
      exit: { opacity: 0, filter: 'blur(8px)', y: 4 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -10 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
}

function splitText(text, per) {
  if (per === 'line') return text.split('\n')
  if (per === 'word') return text.split(/(\s+)/)
  return text.split('')
}

export function TextEffect({
  children,
  per = 'word',
  as: Tag = 'p',
  preset = 'fade',
  delay = 0,
  speedReveal = 1,
  className = '',
  trigger = true,
}) {
  const segments = splitText(children, per)
  const { container, item } = presetVariants[preset] || presetVariants.fade
  const stagger = defaultStaggerTimes[per] / speedReveal

  const containerVariants = {
    ...container,
    visible: {
      ...container.visible,
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  }

  const MotionTag = motion[Tag] || motion.p

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          className={className}
        >
          {segments.map((segment, i) => (
            <motion.span
              key={`${segment}-${i}`}
              variants={item}
              style={{ display: 'inline-block', whiteSpace: per === 'line' ? 'pre-wrap' : 'pre' }}
            >
              {segment}
            </motion.span>
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  )
}
