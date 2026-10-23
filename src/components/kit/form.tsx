'use client'

import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ── Drawer ───────────────────────────────────────────────────────────────────

export const Drawer = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className={cn('p-0 gap-0 w-full flex flex-col bg-white', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-stone-100">
        <div>
          <SheetTitle className="text-lg font-extrabold tracking-tight text-stone-900">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-sm text-stone-500 mt-1">{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="h-9 w-9 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/60 flex items-center justify-end gap-2">{footer}</div>}
    </SheetContent>
  </Sheet>
)

// ── Fields ───────────────────────────────────────────────────────────────────

export const Field = ({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-stone-700">
      {label}
    </label>
    {children}
    {error ? <p className="text-xs text-rose-600">{error}</p> : hint ? <p className="text-xs text-stone-400">{hint}</p> : null}
  </div>
)

const CONTROL =
  'w-full h-10 rounded-xl border border-stone-200 bg-white px-3 text-base sm:text-sm text-stone-800 placeholder:text-stone-400 transition-colors focus:outline-none focus:border-endeavour focus:ring-2 focus:ring-endeavour/15 aria-[invalid=true]:border-rose-300'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string }>(
  ({ className, prefix, ...props }, ref) =>
    prefix ? (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-400 pointer-events-none">{prefix}</span>
        <input ref={ref} className={cn(CONTROL, 'pl-7', className)} {...props} />
      </div>
    ) : (
      <input ref={ref} className={cn(CONTROL, className)} {...props} />
    )
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} rows={3} className={cn(CONTROL, 'h-auto py-2.5 resize-none', className)} {...props} />
  )
)
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string | number; label: string }[]; placeholder?: string }
>(({ className, options, placeholder, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      CONTROL,
      'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%2378716c%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E")] bg-[right_0.75rem_center] bg-no-repeat pr-9',
      className
    )}
    {...props}
  >
    {placeholder !== undefined && (
      <option value="" disabled>
        {placeholder}
      </option>
    )}
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
))
Select.displayName = 'Select'

// Pill-style single choice (controlled).
export const Segmented = <T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  ariaLabel: string
}) => (
  <div role="radiogroup" aria-label={ariaLabel} className="inline-flex w-full rounded-xl bg-stone-100 p-1 gap-1">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        role="radio"
        aria-checked={value === o.value}
        onClick={() => onChange(o.value)}
        className={cn(
          'flex-1 h-8 rounded-lg text-xs font-semibold transition-all',
          value === o.value ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
)

export const Toggle = ({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between gap-3 w-full text-left"
  >
    <span>
      <span className="block text-[13px] font-semibold text-stone-700">{label}</span>
      {hint && <span className="block text-xs text-stone-400">{hint}</span>}
    </span>
    <span className={cn('relative h-6 w-10 rounded-full transition-colors flex-shrink-0', checked ? 'bg-endeavour' : 'bg-stone-200')}>
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </span>
  </button>
)

export const FormGrid = ({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) => (
  <div className={cn('grid gap-4', cols === 2 && 'sm:grid-cols-2', cols === 3 && 'sm:grid-cols-3')}>{children}</div>
)

export const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-4">
    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">{title}</p>
    {children}
  </section>
)

// ── Confirm ──────────────────────────────────────────────────────────────────

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="rounded-2xl">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-stone-900">{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
        <AlertDialogAction className="rounded-xl bg-rose-600 hover:bg-rose-700" onClick={onConfirm}>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)

// Number fields from react-hook-form come in as strings.
export const toNum = (v: unknown, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
