'use client'
import React, { forwardRef } from 'react'
import { FormItem, FormControl, FormDescription, FormMessage, FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '@radix-ui/react-label'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import { InputsProps } from './logics/templates'

const InputsTemplate = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputsProps>(
  (
    {
      id,
      // hidden,
      control,
      label,
      labelclassname,
      isTextarea,
      placeholder,
      // currentValue,
      // rules,
      // isNumber,
      isRequired = false,
      rowsHeight,
      // isPassword,
      classname,
      // isOTP,
      parentClassname,
      // style,
      extraWidget,
      // handleChange,
      // handleTextAreaChange,
      inputStyle,
      inputType = 'text',
      readOnly = false,
      isDesc = false,
      desc,
      prefixIcon,
      // suffixIcon,
      // boxNumber,
      name,
      handleBlur,
      handleBlurTextarea,
      autoFocus,
      onKeyDown,
      containerClassName,
      extraWidgetClassName,
    },
    ref
  ) => {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className={`w-full ${parentClassname}`}>
                {label && (
                  <Label htmlFor={inputType} className={`text-endeavour bytewave-paragraph ${labelclassname}`}>
                    {label}
                  </Label>
                )}
                <div className={cn('w-full flex space-x-2 items-center', containerClassName)}>
                  {isTextarea ? (
                    <Textarea
                      required={isRequired}
                      {...field}
                      ref={(el) => {
                        if (typeof ref === 'function') ref(el)
                        else if (ref) ref.current = el // Forward ref
                        field.ref(el) // Attach react-hook-form's ref
                      }}
                      placeholder={placeholder}
                      rows={rowsHeight}
                      autoFocus={autoFocus}
                      className={cn('relative  z-20 rounded-lg bytewave-paragraph px-2 placeholder:text-grey-100', classname)}
                      readOnly={readOnly}
                      onBlur={handleBlurTextarea}
                      onKeyDown={onKeyDown}
                      
                    />
                  ) : (
                    <div className="flex w-full relative items-center">
                      {prefixIcon && <Search className="absolute left-2 h-5 transform text-stone-500 z-10" />}
                      <Input
                        {...field}
                        ref={(el) => {
                          if (typeof ref === 'function') ref(el)
                          else if (ref) ref.current = el // Forward ref
                          field.ref(el) // Attach react-hook-form's ref
                        }}
                        id={id}
                        required={isRequired}
                        onKeyDown={onKeyDown}
                        autoFocus={autoFocus}
                        contentEditable={true}
                        readOnly={readOnly}
                        type={inputType}
                        style={inputStyle}
                        className={cn(
                          'right-0 border border-grey-100 rounded-lg bytewave-paragraph p-2 placeholder:text-stone-500 mt-2 resize-none text-stone-500',
                          classname
                        )}
                        placeholder={placeholder}
                        onBlur={handleBlur}
                        {...(inputType === 'number' && { min: 1 })}
                      />
                    </div>
                  )}
                  <div className={extraWidgetClassName}>{extraWidget}</div>
                </div>
              </div>
            </FormControl>
            {isDesc && <FormDescription>{desc ?? 'This is your public display name.'}</FormDescription>}
            <FormMessage className="block text-red-400 -mt-10 bytewave-paragraph" />
          </FormItem>
        )}
      />
    )
  }
)

InputsTemplate.displayName = 'InputsTemplate'

export default InputsTemplate
