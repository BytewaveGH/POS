import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

type PopoverProviderProps = {
  trigger: React.ReactNode
  content: React.ReactNode
  contentClassName?: string
  open?: boolean
  modal?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}
export function PopoverTemplate({ trigger, contentClassName, content, open, modal, onOpenChange, defaultOpen }: PopoverProviderProps) {
  return (
    <Popover open={open} modal={modal} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild className={`border-none`}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className={cn(`w-80 outline-none`, contentClassName)}>{content}</PopoverContent>
    </Popover>
  )
}
