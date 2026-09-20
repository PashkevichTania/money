import SettingsPage from '@/features/settings/pages/SettingsPage'
import AddExpenseDialog from '@/features/expenses/components/AddExpenseDialog'
import { BalanceSummary } from '@/features/groups/components/BalancesTab'
import type { Expense, Settlement } from '@/types/expense'
import RecordSettlementDialog, {
  type TransferSuggestion,
} from '@/features/groups/components/RecordSettlementDialog'
import type { Group } from '@/types/group'
import type { UserProfile } from '@/types/user'
import { useState } from 'react'
import { Check, ArrowUpRight, Plus, Info, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'

const previewGroup: Group = {
  id: 'ui-preview-only',
  name: 'Weekend in Lisbon',
  baseCurrency: 'EUR',
  memberIds: ['jamie', 'alex', 'sam'],
  createdBy: 'jamie',
  createdAt: '2026-09-20',
  updatedAt: '2026-09-20',
}
const previewMembers: UserProfile[] = previewGroup.memberIds.map((id) => ({
  id,
  displayName: id[0].toUpperCase() + id.slice(1),
  email: `${id}@example.com`,
  photoURL: null,
  defaultCurrency: 'EUR',
  createdAt: '2026-09-20',
}))

export default function UiPreviewPage() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [previewPayments, setPreviewPayments] = useState<Settlement[]>([])
  const [recordPayment, setRecordPayment] = useState<{
    suggestion?: TransferSuggestion
  } | null>(null)
  const [balancesOpen, setBalancesOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  return (
    <div className="space-y-8">
      <Button
        variant="outline"
        onClick={() => setSettingsOpen((value) => !value)}
      >
        Preview settings
      </Button>
      {settingsOpen && <SettingsPage />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-positive">
            SplitSmart / Design system
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            A little more clarity.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The shared visual language for your workspace. Sample data below is
            for preview only.
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1.5">
          Development preview
        </Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setExpenseOpen(true)}>
          Preview expense form
        </Button>
        <Button
          variant="outline"
          onClick={() => setBalancesOpen((value) => !value)}
        >
          Preview balances
        </Button>
        <p className="self-center text-sm text-muted-foreground">
          Try all split methods without saving data.
        </p>
      </div>
      {balancesOpen && (
        <BalanceSummary
          group={previewGroup}
          members={previewMembers}
          currentUserId="jamie"
          settlements={previewPayments}
          onRecord={(suggestion) => setRecordPayment({ suggestion })}
          onDelete={(payment) =>
            setPreviewPayments((payments) =>
              payments.filter((p) => p.id !== payment.id),
            )
          }
          expenses={[
            {
              id: 'sample-dinner',
              groupId: previewGroup.id,
              title: 'Dinner',
              originalAmount: 84,
              originalCurrency: 'EUR',
              convertedAmount: 84,
              groupCurrency: 'EUR',
              splitType: 'equal',
              paidBy: [{ userId: 'jamie', amount: 84 }],
              participants: previewGroup.memberIds.map((userId) => ({
                userId,
                value: 1,
              })),
              expenseDate: '2026-09-20',
              createdBy: 'jamie',
              updatedBy: 'jamie',
              createdAt: '2026-09-20',
              updatedAt: '2026-09-20',
            } satisfies Expense,
          ]}
        />
      )}
      {expenseOpen && (
        <AddExpenseDialog
          open
          preview
          group={previewGroup}
          members={previewMembers}
          onClose={() => setExpenseOpen(false)}
        />
      )}
      {recordPayment && (
        <RecordSettlementDialog
          group={previewGroup}
          members={previewMembers}
          currentUserId="jamie"
          suggestion={recordPayment.suggestion}
          onClose={() => setRecordPayment(null)}
          onSave={async (id, input) => {
            setPreviewPayments((payments) => [
              ...payments.filter((p) => p.id !== id),
              {
                ...input,
                id,
                createdBy: 'jamie',
                createdAt: new Date().toISOString(),
              },
            ])
          }}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['#0C4137', 'Forest', 'Primary actions'],
          ['#06D6A0', 'Mint', 'Selected details'],
          ['#FED766', 'Sunshine', 'Pending states'],
        ].map(([color, name, role]) => (
          <div
            key={name}
            className="flex items-center gap-4 rounded-md border bg-card p-5"
          >
            <span
              className="size-12 shrink-0 rounded-md"
              style={{ background: color }}
            />
            <div>
              <p className="font-semibold">{name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{role}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions & states</CardTitle>
            <CardDescription>
              One clear next step, with quieter supporting actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Button>
                <Plus />
                Add expense
              </Button>
              <Button variant="outline">
                View details
                <ArrowUpRight />
              </Button>
              <Button variant="secondary">Selected</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="destructive">Delete</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Unavailable</Button>
              <Button disabled>
                <LoaderCircle className="animate-spin" />
                Saving...
              </Button>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <Check />
                Saved
              </Badge>
              <Badge className="bg-warning/20 text-warning-foreground">
                Pending
              </Badge>
              <Badge variant="outline">EUR</Badge>
              <Badge variant="destructive">Action needed</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clear inputs</CardTitle>
            <CardDescription>
              Labels, useful hints and errors close to the field.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preview-name">Group name</Label>
              <Input id="preview-name" placeholder="e.g. Weekend in Lisbon" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="preview-currency">Base currency</Label>
                <Input id="preview-currency" value="EUR" readOnly />
                <p className="text-xs text-muted-foreground">
                  Fixed when the group is created.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-amount">Amount</Label>
                <Input
                  id="preview-amount"
                  placeholder="0.00"
                  aria-invalid="true"
                  aria-describedby="preview-error"
                />
                <p id="preview-error" className="text-xs text-destructive">
                  Enter an amount greater than zero.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense list</CardTitle>
            <CardDescription>
              Example entries, with amounts aligned for scanning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {[
              ['Dinner with friends', 'Equal split · 3 people', '€84.00'],
              ['Train tickets', 'Paid by you · 2 people', '€46.50'],
            ].map(([title, subtitle, amount]) => (
              <div
                key={title}
                className="flex items-center gap-4 border-b py-4 first:pt-0 last:border-0"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <ArrowUpRight className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                </div>
                <span className="ml-auto whitespace-nowrap text-sm font-semibold tabular-nums">
                  {amount}
                </span>
              </div>
            ))}
            <div
              className="mt-5 flex items-center gap-3"
              aria-label="Loading example"
            >
              <Skeleton className="size-10 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feedback & overlays</CardTitle>
            <CardDescription>
              Context and confirmation without losing your place.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info />
              <AlertTitle>A fixed point of reference</AlertTitle>
              <AlertDescription>
                All expenses in a group use its original base currency.
              </AlertDescription>
            </Alert>
            <Sheet>
              <SheetTrigger render={<Button variant="outline" />}>
                Preview a panel
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Ready for the next shared plan?</SheetTitle>
                  <SheetDescription>
                    This is a preview panel. No data will be saved.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-4 text-sm leading-6 text-muted-foreground">
                  Use Escape to close, or tab through the actions. Focus returns
                  to the button that opened this panel.
                </div>
                <SheetFooter>
                  <SheetClose
                    render={<Button />}
                    onClick={() => setSaved(true)}
                  >
                    Try confirmation
                  </SheetClose>
                  <SheetClose render={<Button variant="outline" />}>
                    Cancel
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            {saved && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-positive"
              >
                <Check className="size-4" />
                Preview confirmed. No data changed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
