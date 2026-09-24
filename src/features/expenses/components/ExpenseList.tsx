import { MoreHorizontal, Pencil, Receipt, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Message } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { getExpenseTypeDetails } from '@/config/expenseTypes';
import { useExpenseList } from '@/features/expenses/hooks/useExpenseList';
import type { Expense } from '@/types/expense';
import type { Group } from '@/types/group';
import type { UserProfile } from '@/types/user';
import { formatMoney } from '@/utils/currency';
import { formatDate } from '@/utils/dates';
import { computeNetBalances } from '@/utils/split';

import SettlementRow from './SettlementRow';

export default function ExpenseList({
  group,
  members,
  onEditExpense,
}: {
  group: Group;
  members: UserProfile[];
  onEditExpense: (expense: Expense) => void;
}) {
  const { t } = useTranslation();
  const {
    confirmDelete,
    currentUser: me,
    deleting: busy,
    error,
    expenseToDelete: toDelete,
    expenses,
    getMemberName: getName,
    loading,
    query,
    setExpenseToDelete: setToDelete,
    setQuery,
    visibleExpenses: visible,
    filter,
    setFilter,
    retry,
  } = useExpenseList(group.id, members);
  return (
    <div className="space-y-4">
      {error && (
        <>
          <Message error>{error}</Message>
          <Button variant="outline" onClick={retry}>
            {t('Retry')}
          </Button>
        </>
      )}
      <div className="flex flex-wrap gap-3">
        <NativeSelect
          aria-label={t('Entry type')}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">{t('All entries')}</option>
          <option value="expense">{t('Expenses')}</option>
          <option value="settlement">{t('Settlements')}</option>
        </NativeSelect>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 size-5 text-muted-foreground" />
          <Input
            className="bg-card pl-10"
            aria-label={t('Search entries')}
            placeholder={t('Search entries...')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {loading && !expenses.length ? (
        <Skeleton className="h-64 rounded-md" />
      ) : !visible.length ? (
        <div className="rounded-md border border-dashed bg-card p-10 text-center">
          <Receipt className="mx-auto mb-4 size-8 text-positive" />
          <h2 className="font-semibold">
            {query || filter !== 'all'
              ? t('No matching entries')
              : t('No entries yet')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {query
              ? t('Try another search.')
              : t('Add your first expense to start keeping track together.')}
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-md border bg-card">
          {visible.map((entry) => {
            if (entry.kind === 'settlement')
              return (
                <SettlementRow
                  key={`settlement:${entry.value.id}`}
                  settlement={entry.value}
                  userId={me?.id}
                  name={getName}
                />
              );
            const expense = entry.value;
            const { Icon, label } = getExpenseTypeDetails(expense.type);
            const mine = me ? computeNetBalances(expense)[me.id] || 0 : 0;
            return (
              <article
                key={`expense:${expense.id}`}
                className="flex gap-3 p-4 sm:gap-4 sm:p-5"
              >
                <span
                  title={t(label)}
                  className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground sm:size-10"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {expense.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {expense.type && <>{t(label)} · </>}
                        {formatDate(expense.expenseDate)} ·{' '}
                        {t(expense.splitType)} ·{' '}
                        {t('members', { count: expense.participants.length })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatMoney(
                          expense.convertedAmount,
                          expense.groupCurrency
                        )}
                      </p>
                      {expense.originalCurrency !== expense.groupCurrency && (
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {formatMoney(
                            expense.originalAmount,
                            expense.originalCurrency
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {expense.paidBy
                      .map((p) =>
                        t('{{name}} paid {{amount}}', {
                          name: getName(p.userId),
                          amount: formatMoney(
                            p.amount,
                            expense.originalCurrency
                          ),
                        })
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
                        ? t('No balance on this expense')
                        : `${mine > 0 ? t('You get back') : t('You owe')} ${formatMoney(Math.abs(mine), expense.groupCurrency)}`}
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
                          aria-label={t('Actions for {{title}}', {
                            title: expense.title,
                          })}
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditExpense(expense)}>
                        <Pencil />
                        {t('Edit expense')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setToDelete(expense)}
                      >
                        <Trash2 />
                        {t('Delete expense')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={t('Delete expense?')}
        description={t('Permanently delete {{title}}?', {
          title: toDelete?.title || '',
        })}
        busy={busy}
      >
        <p className="text-sm text-muted-foreground">
          {t(
            'This cannot be undone. Its effect on the balances will be removed.'
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setToDelete(null)}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void confirmDelete()}
          >
            {busy ? t('Deleting...') : t('Delete expense')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
