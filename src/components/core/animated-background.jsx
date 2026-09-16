import { Children, cloneElement, isValidElement, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export function AnimatedBackground({
  children,
  value,
  defaultValue,
  onValueChange,
  className = '',
  transition,
  enableHover = false,
}) {
  const [internalId, setInternalId] = useState(defaultValue ?? null)
  const activeId = value !== undefined ? value : internalId

  function setActiveId(id) {
    if (value === undefined) setInternalId(id)
    onValueChange?.(id)
  }

  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child
    const id = child.props['data-id']
    const isActive = activeId === id

    const interactionProps = enableHover
      ? {
          onMouseEnter: () => setActiveId(id),
          onMouseLeave: () => setActiveId(defaultValue ?? null),
        }
      : {
          onClick: (e) => {
            child.props.onClick?.(e)
            setActiveId(id)
          },
        }

    return cloneElement(child, {
      ...interactionProps,
      'data-checked': isActive ? 'true' : 'false',
      className: `${child.props.className || ''} relative isolate`.trim(),
      children: (
        <>
          <AnimatePresence initial={false}>
            {isActive && (
              <motion.span
                layoutId="animated-background"
                className={className}
                style={{ position: 'absolute', inset: 0, zIndex: -1 }}
                transition={transition}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
          {child.props.children}
        </>
      ),
    })
  })
}
