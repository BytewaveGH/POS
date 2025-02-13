import { MouseEventHandler } from 'react'
import { Control, FieldValues } from 'react-hook-form'

export interface IGeneric {
  [x: string]: string | number | undefined | ISubGeneric | File | null | object
}

// Apparently we forgot that IGENERIC itself is a type. So we need to create a base one
export interface ISubGeneric {
  [x: string]: string | number | undefined | File | string[] | number[] | []
}

export interface CardProps {
  titleExtra?: React.ReactNode | string
  title?: React.ReactNode | string
  footer?: React.ReactNode | string
  cardStyle?: React.CSSProperties
  content?: React.ReactNode | string
  isBordered?: boolean
  isToolbar?: boolean
  isDisabled?: boolean
  classname?: string
  contentClassname?: string
  footerClassname?: string
  headerClassName?: string
  titleExtraClassName?: string
  onClick?: MouseEventHandler<HTMLDivElement>
  onDblClick?: MouseEventHandler<HTMLDivElement>
  handleEdit?: (e?: any) => void
  handleDelete?: (e?: any) => void
  handleDuplicate?: (e?: any) => void
  handleDragEnter?: (e: React.DragEvent<HTMLDivElement>, index?: number) => void
  handleDragStart?: (e: React.DragEvent<HTMLDivElement>, index?: number) => void
  handleDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
}

export interface AccordionProps {
  isDynamic?: boolean
  type?: 'single' | 'multiple'
  itemContents?: {
    id: string
    title?: string | React.ReactNode
    content?: string | React.ReactNode
    leadingIcon?: string | React.ReactNode
  }[]
  titleClassName?: string
  mainClassName?: string
  classname?: string
  triggerClassName?: string
  headingClassname?: string
  accordionItemClassName?: string
  defaultValue?: string
  value?: string
  isCollapsible?: boolean
  handleChange?: (e?: string) => void
}

export interface InputsProps<T = any> {
  ref?: any
  control?: Control<FieldValues> | T
  label?: string | React.ReactNode
  hidden?: boolean
  parentClassname?: string
  extraWidgetClassName?: string
  style?: React.CSSProperties
  isRequired?: boolean
  extraWidget?: React.ReactNode | string
  inputStyle?: React.CSSProperties
  readOnly?: boolean
  inputType?: 'text' | 'password' | 'number' | 'email' | 'search' | 'tel' | 'range' | 'file' | 'checkbox' | 'date'
  placeholder?: string
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleTextAreaChange?: React.ChangeEventHandler<HTMLTextAreaElement> | undefined
  handleBlur?: (e: React.FocusEvent<HTMLInputElement> | undefined) => void
  handleBlurTextarea?: (e: React.FocusEvent<HTMLTextAreaElement> | undefined) => void
  prefixIcon?: string
  suffixIcon?: string
  boxNumber?: number
  isPassword?: boolean
  isOTP?: boolean
  autoFocus?: boolean
  isTextarea?: boolean
  isNumber?: boolean
  classname?: string
  rowsHeight?: number
  name: string
  rules?: string
  currentValue?: string
  labelclassname?: string
  isDesc?: boolean
  desc?: string
  id?: string
  containerClassName?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement> | undefined
}

export interface ImageUploaderProps {
  control?: Control<FieldValues>
  name: string
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  // handleManualUpload?: () => void
  handleAiGenerator?: () => void
  isOptions?: boolean
  isBase64?: boolean
  isImage?: string
  checkIfImageChanges?: boolean
}

export interface ButtonProps {
  isText?: boolean
  text?: string
  buttonID?: string
  classname?: string
  textclassname?: string
  handleClick?: () => void
  type?: 'button' | 'reset' | 'submit'
  btnType?: 'outline' | 'default' | 'secondary' | 'destructive' | 'ghost' | 'link'
  isDisabled?: boolean
  isChild?: boolean
  prefixIcon?: string | React.ReactNode
  suffixIcon?: string | React.ReactNode
}

export interface DatagridProps<T = any> {
  // ref?: AgGridReact
  // columns: ColDef[]
  data: T[]
  enablePagination: boolean
  recordSelection?: boolean
  paginationPageSize: number
  containerHeight?: number | string
  containerStyles?: React.CSSProperties
  gridHeight?: number | string
  selectionType: 'singleRow' | 'multiRow'
  // rowClassRules?: RowClassRules
  // cellClassRules?: CellClassRules
  handleRowClick?: (data: T) => void
  handleRowSelectonClick?: (data: T) => void
  handlePageChanged?: (data: T) => void
  handleCellChange?: (data: T) => void
  enableCheckboxes?: boolean
  enableClickSelection?: boolean
  pageSizeAuto?: boolean
  paginationPageSizeSelector?: number[]
  loadingIndicator?: boolean
}
