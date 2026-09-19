import { useState, type ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function AuthField({
  label,
  error,
  id,
  type,
  ...props
}: ComponentProps<'input'> & { label: string; error?: string; id: string }) {
  const [visible, setVisible] = useState(false)
  const password = type === 'password'
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={password && visible ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={password ? 'pr-12' : ''}
          {...props}
        />
        {password && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-0.5 size-10"
            aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? (
              <EyeOff aria-hidden="true" />
            ) : (
              <Eye aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
