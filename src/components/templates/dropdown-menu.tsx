'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '../ui/label'
import { DropdownMenuItem, RadioGroup } from '@radix-ui/react-dropdown-menu'
import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ISubGeneric } from './templates'
import { RadioGroupItem } from '@radix-ui/react-radio-group'

type LaunchDropDownProps = {
  handleClick?: ((value: string) => void) | undefined
  dropDownList: ISubGeneric[]
  id: string
  value: string
  title: string
  defaultValue: string
}

export function LaunchDropDown({ handleClick, dropDownList, id, value, title, defaultValue }: LaunchDropDownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bytewave-link font-mulish-regular  mt-0 bg-gray-200 text-stone-600  hover:text-cornflowerBlue hover:bg-gray-100 border-stone-200
                        p-0
                        px-6
                       w-28
                        rounded
                        h-6"
        >
          {title}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white p-3">
        <DropdownMenuLabel className="flex items-center">
           <div className="ml-2">{title}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <RadioGroup defaultValue={defaultValue} onValueChange={handleClick}>
          {dropDownList.map((item, index) => {
            return (
              <Fragment key={index}>
                <div className="flex items-center space-x-2 py-1">
                <RadioGroupItem value={`${item[`${id}`]}`} id="r1" />
                <Label htmlFor="r1">{`${item[`${value}`]}`}</Label>
              </div>
              </Fragment>
            )
          })}

          {/* <div className="flex items-center space-x-2  py-1">
            <RadioGroupItem value="1" id="r2" />
            <Label htmlFor="r2">Keep open</Label>
          </div>
          <div className="flex items-center space-x-2  py-1">
            <RadioGroupItem value="2" id="r3" />
            <Label htmlFor="r3">Pursue now</Label>
          </div> */}
        </RadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DropdownTemplateProps {
  className?: string
  showArrow?: boolean
  triggerLabel: React.ReactNode
  triggerLabelClass?: string
  dropdownItemClass?: string
  items: React.ReactNode[]
  isOpen: boolean
  handleOpen?: () => void
}

export const DropdownTemplate = ({
  triggerLabel,
  className,
  triggerLabelClass,
  items,
  dropdownItemClass,
  showArrow = true,
  handleOpen,
  isOpen = false,
}: DropdownTemplateProps) => {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <DropdownMenu open={isOpen || open} onOpenChange={handleOpen || setOpen}>
      <DropdownMenuTrigger asChild>
        <div
          onClick={() => {
            setOpen(true)
            handleOpen && handleOpen()
          }}
          className={cn('flex items-center', triggerLabelClass)}
        >
          {triggerLabel}
          {showArrow && (
            <ChevronDown
              onClick={() => {
                handleOpen && handleOpen()
              }}
              size={16}
              className={`${isOpen ? 'rotate-180' : 'rotate-0'} transform duration-300`}
            />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={cn('w-fit bg-white p-2', className)}>
        {items.map((item, idx) => (
          <Fragment key={idx}>
            <DropdownMenuItem className=" rounded-md ">
              <div
                onClick={(e) => {
                  setOpen(false)
                  e.stopPropagation() // Prevent the dropdown from closing
                }}
                className={cn(dropdownItemClass)}
              >
                {item}
              </div>
            </DropdownMenuItem>
            {idx !== items.length - 1 && <DropdownMenuSeparator />}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
