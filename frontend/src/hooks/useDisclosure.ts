import { useState, useCallback } from "react"

export function useDisclosure<T = any>(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)
  const [data, setData] = useState<T | null>(null)

  const onOpen = useCallback((itemData: T | null = null) => {
    setData(itemData)
    setIsOpen(true)
  }, [])

  const onClose = useCallback(() => {
    setIsOpen(false)
    setData(null)
  }, [])

  const onToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return { isOpen, data, onOpen, onClose, onToggle, setData }
}

export default useDisclosure
