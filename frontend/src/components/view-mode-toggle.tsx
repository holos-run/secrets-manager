import type { ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ToggleOption {
  value: string
  label: string
  icon?: ReactNode
}

interface ViewModeToggleProps {
  value: string
  onValueChange: (value: string) => void
  options: [ToggleOption, ToggleOption]
}

/** Shared tab treatment for alternate representations of the same resource. */
export function ViewModeToggle({ value, onValueChange, options }: ViewModeToggleProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== value) onValueChange(nextValue)
      }}
    >
      <TabsList>
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>
            {option.icon}
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
