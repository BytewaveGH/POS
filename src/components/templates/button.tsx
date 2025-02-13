'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ButtonProps } from './templates'
import { Button } from '../ui/button'

const ButtonTemplate = ({
  type = 'submit',
  btnType = 'default',
  isText = false,
  text = 'Search',
  buttonID = 'default',
  classname,
  textclassname,
  handleClick,
  isDisabled = false,
  isChild = false,
  prefixIcon,
  suffixIcon,
}: ButtonProps) => {
  return (
    <>
      <Button
        asChild={isChild}
        type={type}
        variant={btnType}
        disabled={isDisabled}
        onClick={handleClick}
        id={buttonID}
        className={cn( 
          `border-[1px] p-4 flex justify-center items-center  border-slate-200  bg-endeavour  text-white text-xs  hover:bg-veniceBlue h-9 px-6 mt-4 rounded-md`,
          classname
        )}
      >
        <div className=" flex justify-center items-center space-x-1">
          {prefixIcon && prefixIcon}
          {isText && <p className={cn('capitalize bytewave-paragraph', textclassname)}>{text}</p>}
          {suffixIcon && suffixIcon}
        </div>
      </Button>
    </>
  )
}

export default ButtonTemplate
