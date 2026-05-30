'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Buscar artes...' }: SearchBarProps) {
  const [internalValue, setInternalValue] = React.useState(value)
  const [prevValue, setPrevValue] = React.useState(value)

  if (value !== prevValue) {
    setInternalValue(value)
    setPrevValue(value)
  }

  React.useEffect(() => {
    const handler = setTimeout(() => {
      onChange(internalValue)
    }, 400)

    return () => clearTimeout(handler)
  }, [internalValue, onChange])

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-3 h-4 w-4 text-nks-gray-400 pointer-events-none" />
      <Input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        className="pl-9 w-full"
      />
    </div>
  )
}
