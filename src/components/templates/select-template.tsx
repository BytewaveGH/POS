'use client'

import { cn } from '@/lib/utils'
import React from 'react'
import { Control, FieldValues } from 'react-hook-form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface SelectTemplateProps<T = any> {
  label?: string
  name: string
  placeholder?: string
  className?: string
  labelClassName?: string
  triggerClassName?: string
  defaultValue?: string
  content: { text: React.ReactNode; value: string }[]
  control?: Control<FieldValues> | T
  onValueChange?(value: string): void
}

export const SelectTemplate: React.FC<SelectTemplateProps> = ({
  label,
  name,
  className,
  placeholder = 'Select',
  labelClassName,
  triggerClassName,
  defaultValue,
  content = [],
  control,
  onValueChange,
}) => {
  // const form = useFormContext()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel className={cn('bytewave-paragraph text-endeavour font-mulish-regular', labelClassName)}>{label}</FormLabel>}
          <Select onValueChange={onValueChange || field.onChange} value={field.value || defaultValue || 'placeholder'}>
            <FormControl>
              <SelectTrigger className={cn('border border-grey-100  bytewave-paragraph placeholder:text-grey-100', triggerClassName)}>
                <SelectValue
                  placeholder={placeholder}
                  className="bytewave-paragraph text-red-500 placeholder:text-grey-100 text-grey-100  "
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent className={cn('bg-white', className)}>
              <SelectItem value="placeholder" disabled>
                {placeholder}
              </SelectItem>
              {content.map((item, idx) => (
                <SelectItem key={idx} value={item.value || 'no data found'}>
                  <p className="w-full  px-0  flex justify-start text-ellipsis">{item.text}</p>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
