'use client'
import React, { Fragment, useEffect, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { cn } from '@/lib/utils'
import { usePathname } from 'next/navigation'
import { AccordionProps } from './templates'

const AccordionTemplate: React.FC<AccordionProps> = ({
  itemContents,
  classname,
  // defaultValue,
  handleChange,
  titleClassName,
  isCollapsible = true,
  // type = 'single',
  // value,
  triggerClassName,
  mainClassName,
  accordionItemClassName,
  isDynamic = false,
  headingClassname,
}) => {
  const routerName = usePathname()
  const [currentTab, setCurrentTab] = useState('item301')

  useEffect(() => {
    if (isDynamic) {
      const currentLabel = localStorage.getItem('currentLabel')
      setCurrentTab(`${currentLabel ?? 'item301'}`)
    } else {
      const menuItemSelected = localStorage.getItem('currentMenuLabel')
      setCurrentTab(`${menuItemSelected ?? 'item301'}`)
    }
  }, [routerName, setCurrentTab, isDynamic])

  return (
    <Accordion
      type={'single'}
      value={currentTab}
      defaultValue={'item301'}
      collapsible={isCollapsible}
      onValueChange={handleChange}
      className={mainClassName ?? cn('w-full bg-endeavour border-none text-white ')}
    >
      {itemContents?.map(({ id, title, content, leadingIcon }, index) => {
        return (
          <Fragment key={index}>
            <AccordionItem
              key={id}
              value={id ?? 'item-1'}
              onClick={() => {
                setCurrentTab(id)
              }}
              className={`bg-endeavour border-none  ${accordionItemClassName}`}
            >
              <AccordionTrigger
                className={cn(
                  `${`p-2 my-2 text-white  focus:bg-veniceBlue focus:text-white hover:bg-veniceBlue hover:text-white rounded-md ${currentTab == id ? 'bg-veniceBlue text-white focus:text-white' : `${triggerClassName}`}`} `
                )}
              >
                <div className={`flex ${headingClassname}`}>
                  {leadingIcon && <div className="mr-4 ">{leadingIcon}</div>}
                  <span className={cn('text-bytewave-heading', titleClassName)}>{title ?? 'Is it accessible?'}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className={cn('text-bytewave-paragraph border-none bg-endeavour', classname)}>
                {content ?? 'bytewave IG patterns'}
              </AccordionContent>
            </AccordionItem>
          </Fragment>
        )
      })}
    </Accordion>
  )
}

export default AccordionTemplate
