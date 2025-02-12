import { IGeneric } from '@/types/interfaces'
import { z } from 'zod'

// EDIT THIS GENERIC ZOD VALIDATOR SO YOU GUYS CAN USE,

export const validateWithZod = async (form: IGeneric, schema: z.AnyZodObject) => {
  try {
    const values = form
    schema.parse(values)

    return values
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error
      // error.errors.forEach((err) => {
      //   // form.setFields([{ name: err.path[0], errors: [err.message] }])
      // })
    }
  }
}
