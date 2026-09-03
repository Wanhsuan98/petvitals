import type {
  FieldError,
  FieldPath,
  FieldValues,
  RegisterOptions,
  UseFormRegister
} from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type NumberFieldProps<TFieldValues extends FieldValues> = {
  id: FieldPath<TFieldValues>
  label: string
  step?: string
  inputMode?: 'decimal' | 'numeric'
  register: UseFormRegister<TFieldValues>
  registerOptions?: RegisterOptions<TFieldValues>
  error?: FieldError
}

export function NumberField<TFieldValues extends FieldValues>({
  id,
  label,
  step = '1',
  inputMode = 'decimal',
  register,
  registerOptions,
  error
}: NumberFieldProps<TFieldValues>) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode={inputMode}
        step={step}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...register(id, registerOptions)}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  )
}
