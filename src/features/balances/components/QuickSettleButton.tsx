import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  saveSettlementJobs,
  StaleBalanceError,
  type SettlementJob,
} from '@/api/settlementJobs'
import { deleteSettlement } from '@/api/settlements'
import type { PlannedTransfer } from '@/utils/settlementPlan'
import { Button } from '@/components/ui/button'

export default function QuickSettleButton({
  groupId,
  currency,
  transfer,
  userId,
  disabled = false,
}: {
  groupId: string
  currency: string
  transfer: PlannedTransfer
  userId: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const job = useRef<SettlementJob | null>(null)
  const saving = useRef(false)
  return (
    <Button
      variant="outline"
      disabled={disabled || busy}
      onClick={async () => {
        if (saving.current) return
        saving.current = true
        setBusy(true)
        job.current ??= {
          ...transfer,
          groupId,
          currency,
          id: crypto.randomUUID(),
        }
        const current = job.current
        try {
          await saveSettlementJobs([current], userId, () => {})
          job.current = null
          toast.success(t('Payment recorded'), {
            action: {
              label: t('Undo'),
              onClick: () => {
                void deleteSettlement(groupId, current.id)
                  .then(() => toast.success(t('Payment record deleted')))
                  .catch((error: Error) => toast.error(t(error.message)))
              },
            },
          })
        } catch (error) {
          if (error instanceof StaleBalanceError) job.current = null
          toast.error(
            t(
              error instanceof Error
                ? error.message
                : 'Unable to record payment. Try again.',
            ),
          )
        } finally {
          saving.current = false
          setBusy(false)
        }
      }}
    >
      {busy ? t('Saving...') : t('Settle this')}
    </Button>
  )
}
