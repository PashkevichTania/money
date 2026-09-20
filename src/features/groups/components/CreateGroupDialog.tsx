import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, CurrencySelect, Message } from '@/components/ui/field'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_BASE_CURRENCY } from '@/config/currencies'
import { useCurrentUser } from '@/hooks/useGroups'
import { useGroupStore } from '@/stores/groupStore'
import { useNotify } from '@/hooks/useNotify'
import { useNavigate } from 'react-router-dom'

const schema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(60),
  baseCurrency: z.string().min(3, 'Please select a currency'),
})

type FormValues = z.infer<typeof schema>

export default function CreateGroupDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const me = useCurrentUser()
  const navigate = useNavigate()
  const createGroupAndSelect = useGroupStore((s) => s.createGroupAndSelect)
  const loading = useGroupStore((s) => s.loading)
  const errors = useGroupStore((s) => s.errors)
  const clearErrors = useGroupStore((s) => s.clearErrors)
  const { enqueueSnackbar } = useNotify()
  const [localError, setLocalError] = useState<string | null>(null)

  const [previousOpen, setPreviousOpen] = useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    setLocalError(null)
  }

  const defaultCurrency = me?.defaultCurrency || DEFAULT_BASE_CURRENCY

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', baseCurrency: defaultCurrency },
  })

  useEffect(() => {
    if (open) {
      clearErrors()
      reset({ name: '', baseCurrency: defaultCurrency })
    }
  }, [open, defaultCurrency, reset, clearErrors])

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!me) {
        setLocalError('You must be signed in to create a group')
        return
      }
      setLocalError(null)
      clearErrors()
      try {
        const group = await createGroupAndSelect({
          name: values.name,
          baseCurrency: values.baseCurrency,
          memberIds: [me.id],
          createdBy: me.id,
        })
        enqueueSnackbar(`Group "${group.name}" created`, { variant: 'success' })
        onClose()
        navigate(`/groups/${group.id}`, { replace: true })
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to create group'
        setLocalError(msg)
        enqueueSnackbar(msg, { variant: 'error' })
      }
    },
    [me, createGroupAndSelect, clearErrors, enqueueSnackbar, onClose, navigate],
  )

  const busy = isSubmitting || loading
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a group"
      description="Give your shared plans a place of their own."
      busy={busy}
    >
      {(localError || errors.groups) && (
        <Message error>{localError || errors.groups}</Message>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <fieldset disabled={busy} className="space-y-5">
          <Field
            label="Group name"
            placeholder="e.g. Weekend in Lisbon"
            {...register('name')}
            error={formErrors.name?.message}
          />
          <Controller
            control={control}
            name="baseCurrency"
            render={({ field }) => (
              <CurrencySelect
                label="Base currency"
                value={field.value}
                name={field.name}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            This currency is fixed once the group is created. Expenses in other
            currencies will be converted to it.
          </p>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {busy ? 'Creating...' : 'Create group'}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
