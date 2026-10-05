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
  unit?: string
  placeholder?: string
  register: UseFormRegister<TFieldValues>
  registerOptions?: RegisterOptions<TFieldValues>
  error?: FieldError
}

export function NumberField<TFieldValues extends FieldValues>({
  id,
  label,
  step = '1',
  inputMode = 'decimal',
  unit,
  placeholder,
  register,
  registerOptions,
  error
}: NumberFieldProps<TFieldValues>) {
  const errorId = `${id}-error`
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode={inputMode}
          step={step}
          placeholder={placeholder}
          className={unit ? 'pr-14' : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...register(id, registerOptions)}
        />
        {unit && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  )
}
