import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface TooltipProps {
  trigger: string | React.ReactNode
  content: string | React.ReactNode
  triggerClassname?: string
  contentClassname?: string
}

const TooltipTemplate = ({ trigger, content, contentClassname, triggerClassname }: TooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger type="button" className={triggerClassname}>
          {trigger}
        </TooltipTrigger>
        <TooltipContent className={`${contentClassname} bytewave-paragraph bg-white text-stone-500`}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default TooltipTemplate
