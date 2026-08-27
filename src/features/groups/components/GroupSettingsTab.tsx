import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { CURRENCIES } from '@/config/currencies'
import type { Group } from '@/types/group'
import { useGroupStore } from '@/stores/groupStore'
import DeleteGroupDialog from './DeleteGroupDialog'

export default function GroupSettingsTab({ group }: { group: Group }) {
  const { enqueueSnackbar } = useSnackbar()
  const renameGroup = useGroupStore((s) => s.renameGroup)
  const changeBaseCurrency = useGroupStore((s) => s.changeBaseCurrency)
  const [name, setName] = useState(group.name)
  const [currency, setCurrency] = useState(group.baseCurrency)
  const [savingName, setSavingName] = useState(false)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    setName(group.name)
    setCurrency(group.baseCurrency)
  }, [group.id, group.name, group.baseCurrency])

  const nameDirty = name.trim() !== group.name && name.trim().length >= 2
  const currencyDirty = currency !== group.baseCurrency

  const onSaveName = async () => {
    setSavingName(true)
    try {
      await renameGroup(group.id, name.trim())
      enqueueSnackbar('Group renamed', { variant: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not rename group'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setSavingName(false)
    }
  }

  const onSaveCurrency = async () => {
    setSavingCurrency(true)
    try {
      await changeBaseCurrency(group.id, currency)
      enqueueSnackbar('Base currency updated', { variant: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update currency'
      enqueueSnackbar(msg, { variant: 'error' })
    } finally {
      setSavingCurrency(false)
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
        Group settings
      </Typography>
      <Stack spacing={3} sx={{ maxWidth: 520 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
          <TextField
            label="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={() => void onSaveName()}
            disabled={!nameDirty || savingName}
            sx={{ minHeight: 56, flexShrink: 0 }}
          >
            {savingName ? 'Saving…' : 'Save'}
          </Button>
        </Stack>

        <Alert severity="warning">
          Changing the base currency does not retroactively convert existing expenses. Historical
          amounts stay as stored snapshots; new expenses use the new currency.
        </Alert>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
          <FormControl fullWidth>
            <InputLabel id="group-base-currency">Base currency</InputLabel>
            <Select
              labelId="group-base-currency"
              label="Base currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.label} ({c.symbol})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={() => void onSaveCurrency()}
            disabled={!currencyDirty || savingCurrency}
            sx={{ minHeight: 56, flexShrink: 0 }}
          >
            {savingCurrency ? 'Saving…' : 'Save'}
          </Button>
        </Stack>

        <Box sx={{ pt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Danger zone
          </Typography>
          <Button color="error" variant="outlined" onClick={() => setDeleteOpen(true)}>
            Delete group
          </Button>
        </Box>
      </Stack>

      <DeleteGroupDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} group={group} />
    </Box>
  )
}
