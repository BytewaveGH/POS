'use client'

import { Checkbox } from '../ui/checkbox'

type CheckboxTemplateProps = {
  label: string
  className: string
  checkedValue?: any
  handleValueChange?: (e?: any) => void
}
export function CheckboxTemplate({ checkedValue, handleValueChange, label }: CheckboxTemplateProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox checked={checkedValue} onCheckedChange={handleValueChange} id="terms" />
      <label
        htmlFor="terms"
        className="bytewave-paragraph font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
    </div>
  )
}
