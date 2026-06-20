'use client'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import React, { useEffect } from 'react'
import ButtonTemplate from './button'
import { SheetProps } from './logics/templates'

export function SheetTemplate({
  classname,
  title,
  content,
  sheetDescription,
  headerRightText,
  buttonTitle,
  buttonClassName,
  titleClassName,
  descriptionClassName,
  closeClassName,
  closeText,
  hideButton = true,
  style,
  open,
  handleOpen,
  side,
  // TODO: confusion between handleClick and handleClose, I though handleClose does stuff on close
  handleClick,
  handleClose,
  handleOpenChanged,
  extraButton,
  isExtraButton = false,
  contentClassName,
  contentBodyClassName,
  isDisabled = false,
  triggerClassName,
  prefixIcon,
  footer,
  onInteractOutside = false,
}: SheetProps) {
  // Ensure body scroll is restored when sheet closes
  useEffect(() => {
    if (!open) {
      // Force restore body scroll when sheet is closed
      document.body.style.overflow = ''
      document.body.style.pointerEvents = ''
    }
  }, [open])

  return (
    <div className={classname}>
      <Sheet
        open={open}
        onOpenChange={(isOpen) => {
          // If handleOpenChanged is provided, use it; otherwise use handleClose when closing
          if (handleOpenChanged) {
            handleOpenChanged(isOpen)
          } else if (!isOpen && handleClose) {
            handleClose()
          }
        }}
      >
        {isExtraButton ? (
          extraButton
        ) : (
          <>
            {buttonTitle && (
              <div className={`w-full ${triggerClassName}`}>
                {extraButton}
                <SheetTrigger asChild className="w-full" disabled={isDisabled}>
                  {typeof buttonTitle === 'string' ? (
                    <ButtonTemplate
                      isDisabled={isDisabled}
                      prefixIcon={prefixIcon}
                      classname={buttonClassName}
                      isText
                      text={buttonTitle}
                      handleClick={handleOpen}
                    />
                  ) : (
                    <div className={buttonClassName} onClick={handleOpen}>
                      {buttonTitle}
                    </div>
                  )}
                </SheetTrigger>
              </div>
            )}
          </>
        )}

        <SheetContent
          side={side}
          onInteractOutside={(e) => {
            if (onInteractOutside) {
              e.preventDefault()
            }
          }}
          className={cn(
            'bg-white rounded-2xl !top-3 !bottom-3 h-[calc(100vh-1.4rem)] mx-3 flex flex-col',
            // 👇 DEFAULT WIDTH - responsive for different screen sizes
            'md:min-w-[500px] ', //lg:min-w-[600px] xl:min-w-[700px] 2xl:min-w-[800px]
            // 👇 OUTSIDE OVERRIDE (wins)
            contentClassName
          )}
          // className={cn(
          //   // 'bg-white rounded-2xl !top-3 !bottom-3  h-[calc(100vh-1.4rem)] mx-3 md:min-w-[500px] sm:w-[140px] overflow-y-auto',
          //   'bg-white rounded-2xl !top-3 !bottom-3 h-[calc(100vh-1.4rem)] mx-3 md:min-w-[500px] flex flex-col', // use flex layout
          //   contentClassName
          // )}
          style={style}
        >
          <SheetHeader className=" border-b border-gray-200">
            <div className="flex justify-between items-start">
              <aside className="flex-1">
                {title && (
                  <SheetTitle className={`${titleClassName} seedstars-sub-heading font-mulish-semi-bold leading-6`}>{title}</SheetTitle>
                )}
                {headerRightText && <p className="seedstars-paragraph text-gray-500 text-sm leading-4 mt-1">{headerRightText}</p>}
                <SheetDescription className={`${descriptionClassName} seedstars-paragraph text-gray-500 leading-4`}>
                  {sheetDescription}
                </SheetDescription>
              </aside>
              <aside className="flex items-center">{handleClose && <X className="h-6 w-6 cursor-pointer" onClick={handleClose} />}</aside>
            </div>
          </SheetHeader>
          <div className={cn('grid gap-4 flex-1 overflow-y-auto overflow-x-hidden min-h-0 pt-2', contentBodyClassName)}>{content}</div>
          {!hideButton && (
            <SheetFooter className="w-full flex space-x-2 mt-auto border-t border-gray-200 p-4 sm:justify-between">
              <SheetClose asChild>
                <Button onClick={handleClick} className={closeClassName} type="submit">
                  {closeText}
                </Button>
              </SheetClose>
              <div className="">{footer}</div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
