import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import FormHelperText from '@mui/material/FormHelperText'
import { CURRENCIES, DEFAULT_BASE_CURRENCY } from '@/config/currencies'
import { useCurrentUser } from '@/hooks/useGroups'
import { useGroupStore } from '@/stores/groupStore'
import { useSnackbar } from 'notistack'
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
  const { enqueueSnackbar } = useSnackbar()
  const [localError, setLocalError] = useState<string | null>(null)

  const defaultCurrency = me?.defaultCurrency || DEFAULT_BASE_CURRENCY

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', baseCurrency: defaultCurrency },
  })

  useEffect(() => {
    if (open) {
      setLocalError(null)
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
        const msg = err instanceof Error ? err.message : 'Failed to create group'
        setLocalError(msg)
        enqueueSnackbar(msg, { variant: 'error' })
      }
    },
    [me, createGroupAndSelect, clearErrors, enqueueSnackbar, onClose, navigate],
  )

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { borderRadius: 4 } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Create a new group
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {(localError || errors.createGroup) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {localError || errors.createGroup}
          </Alert>
        )}
        <Box component="form" id="create-group-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={3}>
            <TextField
              label="Group name"
              autoFocus
              placeholder="e.g. Summer trip to Portugal"
              {...register('name')}
              error={!!formErrors.name}
              helperText={formErrors.name?.message}
            />
            <Controller
              name="baseCurrency"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!formErrors.baseCurrency}>
                  <InputLabel id="base-currency-label">Base currency</InputLabel>
                  <Select
                    labelId="base-currency-label"
                    label="Base currency"
                    {...field}
                  >
                    {CURRENCIES.map((c) => (
                      <MenuItem key={c.code} value={c.code}>
                        {c.label} ({c.symbol})
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.baseCurrency && (
                    <FormHelperText>{formErrors.baseCurrency.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="text" disabled={isSubmitting || loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          form="create-group-form"
          variant="contained"
          disabled={isSubmitting || loading || !me}
        >
          {isSubmitting || loading ? 'Creating…' : 'Create group'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
