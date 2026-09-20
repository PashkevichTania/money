import { Plus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Section, Message } from '@/components/ui/field'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Link as RouterLink } from 'react-router-dom'
import { useState } from 'react'
import { useSelectedGroup } from '@/hooks/useSelectedGroup'
import MembersTab from '@/features/groups/components/MembersTab'
import BalancesTab from '@/features/groups/components/BalancesTab'
import GroupSettingsTab from '@/features/groups/components/GroupSettingsTab'
import ExpenseList from '@/features/expenses/components/ExpenseList'
import AddExpenseDialog from '@/features/expenses/components/AddExpenseDialog'
import type { Expense } from '@/types/expense'

const TAB_LABELS = ['Expenses', 'Balances', 'Members', 'Settings'] as const

export default function GroupDetailPage() {
  const { group, members, loadingMembers, loading, notFound, error } =
    useSelectedGroup()
  const [tab, setTab] = useState(0)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const openAddExpense = () => {
    setEditingExpense(null)
    setExpenseDialogOpen(true)
  }
  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseDialogOpen(true)
  }
  const closeExpenseDialog = () => {
    setExpenseDialogOpen(false)
    setEditingExpense(null)
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        render={<RouterLink to="/groups" />}
        nativeButton={false}
      >
        <ArrowLeft />
        All groups
      </Button>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-60" />
          <Skeleton className="h-64" />
        </div>
      ) : !group || notFound ? (
        <Section title="Group unavailable">
          <Message error>
            {error || 'This group does not exist or you do not have access.'}
          </Message>
        </Section>
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {group.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {group.baseCurrency} · {group.memberIds.length} members
              </p>
            </div>
            <Button onClick={openAddExpense} disabled={loadingMembers}>
              <Plus />
              Add expense
            </Button>
          </header>
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(Number(value))}
            className="gap-6"
          >
            <div className="overflow-x-auto">
              <TabsList className="h-11 min-w-max border bg-card p-1">
                {TAB_LABELS.map((label, i) => (
                  <TabsTrigger key={label} value={i} className="px-4">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value={0}>
              <ExpenseList
                group={group}
                members={members}
                onEditExpense={openEditExpense}
              />
            </TabsContent>
            <TabsContent value={1}>
              <BalancesTab key={group.id} group={group} members={members} />
            </TabsContent>
            <TabsContent value={2}>
              <MembersTab
                group={group}
                members={members}
                loadingMembers={loadingMembers}
              />
            </TabsContent>
            <TabsContent value={3}>
              <GroupSettingsTab group={group} />
            </TabsContent>
          </Tabs>
          {expenseDialogOpen && (
            <AddExpenseDialog
              open
              onClose={closeExpenseDialog}
              group={group}
              members={members}
              editingExpense={editingExpense}
            />
          )}
        </>
      )}
    </div>
  )
}
