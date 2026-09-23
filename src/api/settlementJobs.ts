import { collection, getDocsFromServer } from 'firebase/firestore'
import { db } from '@/config/firebase'
import type { Expense, Settlement } from '@/types/expense'
import { planSettlements, type PlannedTransfer } from '@/utils/settlementPlan'
import { createSettlement } from './settlements'

export interface SettlementJob extends PlannedTransfer {
  id: string
  groupId: string
  currency: string
}

export class StaleBalanceError extends Error {
  constructor() {
    super(
      'Balances changed. Close this window and review the updated amounts before retrying.',
    )
  }
}

// Serialize saves for each group, including buttons shown in several dashboard sections.
const groupQueues = new Map<string, Promise<void>>()
async function withGroupLock(groupId: string, save: () => Promise<void>) {
  const previous = groupQueues.get(groupId) ?? Promise.resolve()
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  groupQueues.set(groupId, pending)
  await previous
  try {
    await save()
  } finally {
    release()
    if (groupQueues.get(groupId) === pending) groupQueues.delete(groupId)
  }
}

/** Stable job IDs survive partial failures and uncertain network responses. */
export async function saveSettlementJobs(
  jobs: SettlementJob[],
  userId: string,
  onSaved: (id: string) => void,
) {
  for (const groupId of [...new Set(jobs.map((job) => job.groupId))]) {
    await withGroupLock(groupId, async () => {
      const groupJobs = jobs.filter((job) => job.groupId === groupId)
      const [expenseDocs, settlementDocs] = await Promise.all([
        getDocsFromServer(collection(db, 'groups', groupId, 'expenses')),
        getDocsFromServer(collection(db, 'groups', groupId, 'settlements')),
      ])
      const expenses = expenseDocs.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id, groupId }) as Expense,
      )
      const settlements = settlementDocs.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id, groupId }) as Settlement,
      )
      const existing = new Map(settlements.map((s) => [s.id, s]))
      const ownIds = new Set(groupJobs.map((j) => j.id))
      const suggestions = planSettlements(
        expenses,
        settlements.filter((s) => !ownIds.has(s.id)),
        groupJobs[0].currency,
        userId,
      )
      for (const job of groupJobs) {
        if (
          !existing.has(job.id) &&
          !suggestions.some(
            (s) =>
              s.from === job.from &&
              s.to === job.to &&
              Math.round(s.amount * 100) === Math.round(job.amount * 100),
          )
        ) {
          throw new StaleBalanceError()
        }
      }
      for (const job of groupJobs) {
        await createSettlement(job.id, {
          groupId,
          fromUserId: job.from,
          toUserId: job.to,
          amount: job.amount,
          currency: job.currency,
        })
        onSaved(job.id)
      }
    })
  }
}
