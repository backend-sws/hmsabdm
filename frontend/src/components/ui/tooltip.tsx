import React, { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import type { TooltipProps } from "@/types/form-input.types"

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = "top",
  children,
  className,
  delay = 150,
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<any | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2 animate-in fade-in-0 zoom-in-95",
    bottom:
      "top-full left-1/2 -translate-x-1/2 mt-2 animate-in fade-in-0 zoom-in-95",
    left: "right-full top-1/2 -translate-y-1/2 mr-2 animate-in fade-in-0 zoom-in-95",
    right:
      "left-full top-1/2 -translate-y-1/2 ml-2 animate-in fade-in-0 zoom-in-95",
  }

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-zinc-800 dark:border-t-zinc-100 border-x-transparent border-b-transparent border-4",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-800 dark:border-b-zinc-100 border-x-transparent border-t-transparent border-4",
    left: "left-full top-1/2 -translate-y-1/2 border-l-zinc-800 dark:border-l-zinc-100 border-y-transparent border-r-transparent border-4",
    right:
      "right-full top-1/2 -translate-y-1/2 border-r-zinc-800 dark:border-r-zinc-100 border-y-transparent border-l-transparent border-4",
  }

  if (!content) return <>{children}</>

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 max-w-xs rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-normal whitespace-normal text-zinc-100 shadow-lg transition-all duration-150 dark:bg-zinc-100 dark:text-zinc-900",
            positionClasses[position],
            className
          )}
        >
          {content}
          <div className={cn("absolute h-0 w-0", arrowClasses[position])} />
        </div>
      )}
    </div>
  )
}
