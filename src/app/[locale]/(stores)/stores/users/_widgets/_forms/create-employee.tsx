'use client'

import * as z from 'zod'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import InputsTemplate from '@/components/templates/inputs'
import ButtonTemplate from '@/components/templates/button'
import { useAxios } from '@/hooks/use-axios'
import { EmployeeServices } from '../../_logics/services'
import { Check, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { matchingPreset, presetValues, staffModule } from '@/lib/staff-roles'

// ── Single schema — password optional; create-mode is enforced in onSubmit ──
const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  username: z.string().min(1, 'Username is required'),
  phone: z.string().optional(),
  password: z.string().optional(),
  canViewReports: z.boolean().default(false),
  canManageProducts: z.boolean().default(false),
  canManageStock: z.boolean().default(false),
  canManageSales: z.boolean().default(false),
  canManageInvoices: z.boolean().default(false),
  canManageOperations: z.boolean().default(false),
  canManageWarehouses: z.boolean().default(false),
  canManageEmployees: z.boolean().default(false),
})

type EmployeeForm = z.infer<typeof employeeSchema>

interface CreateEmployeeProps {
  // The business's module: decides which permissions are shown and what they're called.
  appType?: string
  mode?: 'create' | 'update'
  employeeId?: number
  initialData?: Partial<EmployeeForm> & Record<string, any>
  onSuccess?: () => void
}

const CreateEmployee = ({ appType, mode = 'create', employeeId, initialData, onSuccess }: CreateEmployeeProps) => {
  const staff = staffModule(appType)
  const request = useAxios()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      email: initialData?.email ?? '',
      username: initialData?.username ?? '',
      phone: initialData?.phone ?? '',
      password: '',
      canViewReports: initialData?.canViewReports ?? false,
      canManageProducts: initialData?.canManageProducts ?? false,
      canManageStock: initialData?.canManageStock ?? false,
      canManageSales: initialData?.canManageSales ?? false,
      canManageInvoices: initialData?.canManageInvoices ?? false,
      canManageOperations: initialData?.canManageOperations ?? false,
      canManageWarehouses: initialData?.canManageWarehouses ?? false,
      canManageEmployees: initialData?.canManageEmployees ?? false,
    },
  })

  // Re-sync form when switching between employees (sheet stays mounted)
  const initKey = initialData?.id ?? 'new'
  useEffect(() => {
    form.reset({
      name: initialData?.name ?? '',
      email: initialData?.email ?? '',
      username: initialData?.username ?? '',
      phone: initialData?.phone ?? '',
      password: '',
      canViewReports: initialData?.canViewReports ?? false,
      canManageProducts: initialData?.canManageProducts ?? false,
      canManageStock: initialData?.canManageStock ?? false,
      canManageSales: initialData?.canManageSales ?? false,
      canManageInvoices: initialData?.canManageInvoices ?? false,
      canManageOperations: initialData?.canManageOperations ?? false,
      canManageWarehouses: initialData?.canManageWarehouses ?? false,
      canManageEmployees: initialData?.canManageEmployees ?? false,
    })
    setSubmitError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initKey])

  const values = form.watch()
  const activePreset = matchingPreset(staff, values)

  const onSubmit = async (data: EmployeeForm) => {
    // Enforce password on create
    if (mode === 'create' && (!data.password || data.password.length < 6)) {
      form.setError('password', { message: 'Password must be at least 6 characters' })
      return
    }
    // Enforce minimum length if a new password is provided on update
    if (mode === 'update' && data.password && data.password.length < 6) {
      form.setError('password', { message: 'Password must be at least 6 characters' })
      return
    }

    setSubmitError('')
    setIsSubmitting(true)
    try {
      const payload: any = { ...data }
      if (mode === 'update' && !payload.password) delete payload.password

      if (mode === 'update' && employeeId) {
        await request(EmployeeServices.Update(employeeId, payload))
      } else {
        await request(EmployeeServices.Create(payload))
      }
      form.reset()
      onSuccess?.()
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex flex-col gap-5 py-2 flex-1 overflow-y-auto pr-1">
          {/* Basic info */}
          <section>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Basic Info</p>
            <div className="flex flex-col gap-3">
              <InputsTemplate control={form.control} name="name" label="Full Name" placeholder="e.g. Kwame Mensah" isRequired />
              <InputsTemplate control={form.control} name="username" label="Username" placeholder="e.g. kwame.mensah" isRequired />
              <InputsTemplate
                control={form.control}
                name="email"
                label="Email"
                placeholder="e.g. kwame@business.com"
                isRequired
                inputType="email"
              />
              <InputsTemplate control={form.control} name="phone" label="Phone" placeholder="e.g. +233 24 000 0000" inputType="tel" />
              <InputsTemplate
                control={form.control}
                name="password"
                label={mode === 'update' ? 'New Password (leave blank to keep)' : 'Password'}
                placeholder="Min 6 characters"
                isRequired={mode === 'create'}
                isPassword
              />
            </div>
          </section>

          {/* Permissions */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-3.5 w-3.5 text-endeavour" />
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Permissions</p>
            </div>

            {/* Role preset quick-fill */}
            <div className="flex flex-col gap-1.5 mb-3">
              <p className="text-[10px] text-gray-400">Quick roles — tap to fill:</p>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick roles">
                {staff.presets.map((role) => {
                  const on = activePreset?.label === role.label
                  return (
                    <button
                      key={role.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        Object.entries(presetValues(role)).forEach(([key, value]) =>
                          form.setValue(key as keyof EmployeeForm, value, { shouldDirty: true })
                        )
                      }
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all active:scale-95',
                        role.color,
                        on && 'ring-2 ring-offset-1 ring-endeavour/40'
                      )}
                    >
                      {on && <Check className="h-3 w-3" />}
                      {role.label}
                      <span className="opacity-60 font-normal">— {role.description}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {staff.permissions.map(({ key, label, description, icon: Icon, color }) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 px-3 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('p-1.5 rounded-lg flex-shrink-0', color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <FormLabel className="block text-sm text-stone-700 font-medium cursor-pointer leading-tight m-0">{label}</FormLabel>
                          <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{description}</p>
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          aria-label={label}
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-endeavour"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-gray-200 pt-4 pb-2 flex flex-col gap-2">
          {submitError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{submitError}</p>}
          <ButtonTemplate
            isText
            text={isSubmitting ? 'Saving...' : mode === 'update' ? 'Update Employee' : 'Add Employee'}
            type="submit"
            isDisabled={isSubmitting}
          />
        </div>
      </form>
    </Form>
  )
}

export default CreateEmployee
