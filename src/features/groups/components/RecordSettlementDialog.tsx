import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Message } from '@/components/ui/field'
import { NativeSelect } from '@/components/ui/native-select'
import { Label } from '@/components/ui/label'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import type { CreateSettlementInput } from '@/api/settlements'
import { formatMoney } from '@/utils/currency'

export type TransferSuggestion = { from: string; to: string; amount: number }

export default function RecordSettlementDialog({
  group,
  members,
  currentUserId,
  suggestion,
  onClose,
  onSave,
}: {
  group: Group
  members: UserProfile[]
  currentUserId: string
  suggestion?: TransferSuggestion
  onClose: () => void
  onSave: (id: string, input: CreateSettlementInput) => Promise<unknown>
}) {
  const [id] = useState(() => crypto.randomUUID())
  const [from, setFrom] = useState(suggestion?.from ?? currentUserId)
  const [to, setTo] = useState(
    suggestion?.to ?? group.memberIds.find((id) => id !== currentUserId) ?? '',
  )
  const [amount, setAmount] = useState(suggestion?.amount.toFixed(2) ?? '')
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [error, setError] = useState('')
  const name = (id: string) =>
    members.find((member) => member.id === id)?.displayName ||
    `Member ${id.slice(0, 6)}`
  const validPeople = from !== to && [from, to].includes(currentUserId)
  return (
    <Modal
      open
      onClose={onClose}
      title="Record a payment"
      description="Record money already transferred outside this app."
      busy={busy}
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (saving.current || !confirmed || !validPeople) return
          saving.current = true
          setBusy(true)
          setError('')
          try {
            await onSave(id, {
              groupId: group.id,
              fromUserId: from,
              toUserId: to,
              amount: Number(amount),
              currency: group.baseCurrency,
              note,
            })
            onClose()
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'Unable to record payment. Try again.',
            )
          } finally {
            saving.current = false
            setBusy(false)
          }
        }}
      >
        <fieldset disabled={busy} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settlement-from">Paid by</Label>
              <NativeSelect
                id="settlement-from"
                className="w-full"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value)
                  setConfirmed(false)
                }}
              >
                {group.memberIds.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                    {id === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-to">Paid to</Label>
              <NativeSelect
                id="settlement-to"
                className="w-full"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value)
                  setConfirmed(false)
                }}
              >
                {group.memberIds.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                    {id === currentUserId ? ' (you)' : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          {!validPeople && (
            <Message error>
              Choose two different members. You must be the sender or recipient.
            </Message>
          )}
          <Field
            label={`Amount (${group.baseCurrency})`}
            type="number"
            inputMode="decimal"
            required
            min="0.01"
            max="999999999"
            step="0.01"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              setConfirmed(false)
            }}
          />
          <Field
            label="Note (optional)"
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Message>
            {name(from)} paid {name(to)}{' '}
            {formatMoney(Number(amount) || 0, group.baseCurrency)}. Partial
            payments are allowed. Only record the amount actually transferred.
          </Message>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-primary"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              required
            />
            I confirm this payment has already been made.
          </label>
        </fieldset>
        {error && <Message error>{error}</Message>}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={busy || !confirmed || !validPeople || !Number(amount)}
          >
            {busy ? 'Saving...' : 'Record payment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
