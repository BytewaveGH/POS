import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { TabsProps } from './logics/templates'
import { cn } from '@/lib/utils'

const TabTemplate = ({ items, className }: TabsProps) => {
  return (
    <div className="w-full">
      <Tabs defaultValue={items[0].key} className={cn('bg-slate-300', className)}>
        <TabsList className="w-full flex rounded-md space-x-1 bg-transparent">
          {items.map(({ id, key, label }) => (
            <TabsTrigger key={id} className="w-full px-0 hover:border-b-red-500 border-2" value={key}>
              {label || 'Password'}
            </TabsTrigger>
          ))}
        </TabsList>

        {items.map(({ id, key, content }) => (
          <TabsContent key={id} value={key} className="w-full">
            {content || 'Make changes to your account here.'}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default TabTemplate
