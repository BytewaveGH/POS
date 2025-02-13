'use client'

import { Card, CardContent, CardDescription, CardFooter } from '../ui/card'
import { Copy, EllipsisVertical, PencilLine, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardProps } from './templates'
import { DropdownTemplate } from './dropdown-menu'

const CardTemplate = ({
  cardStyle,
  title,
  titleExtra,
  content,
  classname,
  footer,
  headerClassName,
  titleExtraClassName,
  onClick,
  onDblClick,
  handleEdit,
  handleDelete,
  handleDuplicate,
  handleDragEnter,
  handleDragStart,
  handleDragEnd,
  isDisabled,
  contentClassname,
  footerClassname,
  isToolbar,
}: CardProps) => {
  return (
    <>
      <Card
        draggable
        onDragStart={handleDragStart}
        onDragEnter={handleDragEnter}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          e.preventDefault()
        }}
        onClick={onClick}
        onDoubleClick={onDblClick}
        className={cn(classname, isDisabled ? 'cursor-not-allowed ' : '')}
        style={{ ...cardStyle }}
      >
        {(title || isToolbar) && (
          <>
            <div className={`${headerClassName} ${isToolbar ? 'flex justify-between' : 'w-full'} p-2`}>
              <div className="">{title}</div>

              {isToolbar && (
                <div className="">
                  <DropdownTemplate
                    showArrow={false}
                    triggerLabel={<EllipsisVertical size={16} color={'#0865AC'} />}
                    triggerLabelClass="text-endeavour w-fit"
                    className="h-full"
                    items={[
                      ...(handleEdit
                        ? [
                            <div key={'edit'} onClick={handleEdit} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <PencilLine size={16} className="text-endeavour" />
                              <span className="bytewave-link">Edit</span>
                            </div>,
                          ]
                        : []),
                      // <>
                      //   {handleEdit && (
                      //     <div onClick={handleEdit} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      //       <PencilLine size={16} className="text-endeavour" />
                      //       <span className="bytewave-link">Edit</span>
                      //     </div>
                      //   )}
                      // </>,
                      ...(handleDuplicate
                        ? [
                            <div key={'duplicate'} onClick={handleDuplicate} className="flex items-center gap-2 py-1.5 cursor-pointer">
                              <Copy size={16} className="text-endeavour" />
                              <span className="bytewave-link">Duplicate</span>
                            </div>,
                          ]
                        : []),
                      ...(handleDelete
                        ? [
                            <div key={'delete'} onClick={handleDelete} className="flex gap-2 items-center py-1.5 cursor-pointer">
                              <Trash2 size={16} className="text-red-500" />
                              <span className="bytewave-link">Delete</span>
                            </div>,
                          ]
                        : []),
                      // <>
                      //   {handleDelete && (
                      //     <div onClick={handleDelete} className="flex gap-2 items-center py-1.5 cursor-pointer">
                      //       <Trash2 size={16} className="text-red-500" />
                      //       <span className="bytewave-link">Delete</span>
                      //     </div>
                      //   )}
                      // </>,
                    ]}
                    isOpen={false}
                  />
                </div>
              )}
            </div>
            {titleExtra && <CardDescription className={titleExtraClassName}>{titleExtra ?? 'Card Description'}</CardDescription>}
          </>
        )}
        {content && <CardContent className={contentClassname}>{content}</CardContent>}
        {footer && <CardFooter className={`${footerClassname}`}>{footer ?? 'Card Footer'}</CardFooter>}
      </Card>
    </>
  )
}

export default CardTemplate
