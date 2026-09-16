import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const PopoverContext = createContext(null)

export function useMorphingPopover() {
  return useContext(PopoverContext)
}

const DEFAULT_VARIANTS = {
  initial: { opacity: 0, scale: 0.97, filter: 'blur(3px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.97, filter: 'blur(3px)' },
}

const DEFAULT_TRANSITION = { duration: 0.1, ease: 'easeOut' }

export function MorphingPopover({ children, variants, transition, className = '' }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <PopoverContext.Provider
      value={{ open, setOpen, id, variants: variants || DEFAULT_VARIANTS, transition: transition || DEFAULT_TRANSITION }}
    >
      <div ref={wrapperRef} className={`relative inline-block ${className}`.trim()}>
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function MorphingPopoverTrigger({ children, asChild }) {
  const { open, setOpen } = useContext(PopoverContext)

  if (asChild && isValidElement(children)) {
    return cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e)
        setOpen(!open)
      },
      'aria-expanded': open,
    })
  }

  return (
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
      {children}
    </button>
  )
}

export function MorphingPopoverContent({ children, className = '' }) {
  const { open, variants, transition } = useContext(PopoverContext)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
          transition={transition}
          className={`absolute left-0 top-full mt-2 z-50 rounded-xl border-2 border-primary-100 bg-white shadow-lg origin-top ${className}`.trim()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
