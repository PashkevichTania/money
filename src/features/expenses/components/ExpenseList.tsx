import { useEffect, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Receipt, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Message } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { Group } from '@/types/group'
import type { Expense } from '@/types/expense'
import type { UserProfile } from '@/types/user'
import { useExpenseStore } from '@/stores/expenseStore'
import { useCurrentUser } from '@/hooks/useGroups'
import { useNotify } from '@/hooks/useNotify'
import { formatMoney } from '@/utils/currency'
import { formatDate } from '@/utils/dates'
import { computeNetBalances } from '@/utils/split'
const EMPTY: Expense[] = []
export default function ExpenseList({
  group,
  members,
  onEditExpense,
}: {
  group: Group
  members: UserProfile[]
  onEditExpense: (expense: Expense) => void
}) {
  const expenses = useExpenseStore((s) => s.expensesByGroup[group.id] ?? EMPTY)
  const loading = useExpenseStore((s) => s.loadingByGroup[group.id])
  const error = useExpenseStore((s) => s.errorsByGroup[group.id])
  const load = useExpenseStore((s) => s.loadExpenses)
  const remove = useExpenseStore((s) => s.removeExpense)
  const me = useCurrentUser()
  const { enqueueSnackbar } = useNotify()
  const [query, setQuery] = useState('')
  const [toDelete, setToDelete] = useState<Expense | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void load(group.id).catch(() => undefined)
  }, [group.id, load])
  const getName = (id: string) =>
    members.find((m) => m.id === id)?.displayName || id.slice(0, 6)
  const confirmDelete = async () => {
    if (!toDelete || toDelete.createdBy !== me?.id) return
    setBusy(true)
    try {
      await remove(group.id, toDelete.id)
      setToDelete(null)
      enqueueSnackbar('Expense deleted', { variant: 'success' })
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Could not delete expense',
        { variant: 'error' },
      )
    } finally {
      setBusy(false)
    }
  }
  const visible = expenses.filter((e) =>
    `${e.title} ${e.description || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  return (
    <div className="space-y-4">
      {error && <Message error>{error}</Message>}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
        <Input
          className="bg-card pl-10"
          aria-label="Search expenses"
          placeholder="Search expenses..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading && !expenses.length ? (
        <Skeleton className="h-64 rounded-md" />
      ) : !visible.length ? (
        <div className="rounded-md border border-dashed bg-card p-10 text-center">
          <Receipt className="mx-auto mb-4 size-8 text-positive" />
          <h2 className="font-semibold">
            {query ? 'No matching expenses' : 'No expenses yet'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {query
              ? 'Try another search.'
              : 'Add your first expense to start keeping track together.'}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-md border bg-card">
          {visible.map((expense) => {
            const mine = me ? computeNetBalances(expense)[me.id] || 0 : 0
            return (
              <article
                key={expense.id}
                className="flex gap-3 p-4 sm:gap-4 sm:p-5"
              >
                <span className="hidden size-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground sm:grid">
                  <Receipt className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {expense.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(expense.expenseDate)} · {expense.splitType}{' '}
                        · {expense.participants.length} people
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatMoney(
                          expense.convertedAmount,
                          expense.groupCurrency,
                        )}
                      </p>
                      {expense.originalCurrency !== expense.groupCurrency && (
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {formatMoney(
                            expense.originalAmount,
                            expense.originalCurrency,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {expense.paidBy
                      .map(
                        (p) =>
                          `${getName(p.userId)} paid ${formatMoney(p.amount, expense.originalCurrency)}`,
                      )
                      .join(' · ')}
                  </p>
                  {expense.description && (
                    <p className="mt-2 break-words text-sm text-muted-foreground">
                      {expense.description}
                    </p>
                  )}
                  {me && (
                    <p
                      className={`mt-3 text-xs font-medium tabular-nums ${mine > 0 ? 'text-positive' : mine < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {Math.abs(mine) < 0.005
                        ? 'No balance on this expense'
                        : `${mine > 0 ? 'You get back' : 'You owe'} ${formatMoney(Math.abs(mine), expense.groupCurrency)}`}
                    </p>
                  )}
                </div>
                {expense.createdBy === me?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${expense.title}`}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditExpense(expense)}>
                        <Pencil />
                        Edit expense
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setToDelete(expense)}
                      >
                        <Trash2 />
                        Delete expense
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </article>
            )
          })}
        </div>
      )}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete expense?"
        description={`Permanently delete ${toDelete?.title || 'this expense'}?`}
        busy={busy}
      >
        <p className="text-sm text-muted-foreground">
          This cannot be undone. Its effect on the balances will be removed.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void confirmDelete()}
          >
            {busy ? 'Deleting...' : 'Delete expense'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
