import { Link } from 'react-router-dom'
import { ArrowUpRight, Plus, Users, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Section, Message } from '@/components/ui/field'
import { useAuthStore } from '@/stores/authStore'
import { useGroupStore } from '@/stores/groupStore'
import { useGroups } from '@/hooks/useGroups'
import DashboardBalances from '../components/DashboardBalances'
export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const { groups, loading } = useGroups()
  const error = useGroupStore((s) => s.errors.groups)
  const currencies = [...new Set(groups.map((g) => g.baseCurrency))]
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-positive">
            Your workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Hello, {profile?.displayName?.split(' ')[0] || 'there'}.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A clear place for everything you share.
          </p>
        </div>
        <Button render={<Link to="/groups?new=1" />} nativeButton={false}>
          <Plus />
          Create a group
        </Button>
      </header>
      {error && <Message error>{error}</Message>}
      {profile && !loading && !error && (
        <DashboardBalances groups={groups} userId={profile.id} />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Your groups">
          <div className="flex items-center justify-between">
            <span className="text-4xl font-semibold tabular-nums">
              {loading ? '—' : groups.length}
            </span>
            <Users className="size-6 text-positive" />
          </div>
          <p className="text-sm text-muted-foreground">
            Shared plans, all in one place.
          </p>
        </Section>
        <Section title="Group currencies">
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-semibold">
              {loading ? '—' : currencies.join(' · ') || 'No currencies yet'}
            </span>
            <Globe className="size-6 shrink-0 text-positive" />
          </div>
          <p className="text-sm text-muted-foreground">
            Each group keeps its own base currency.
          </p>
        </Section>
      </div>
      <Section
        title="Recently updated groups"
        description="Pick up where you left off."
      >
        {loading && !groups.length ? (
          <Skeleton className="h-32" />
        ) : groups.length ? (
          <div className="divide-y">
            {groups.slice(0, 5).map((g) => (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="flex items-center gap-4 rounded-md py-4 hover:bg-muted/50"
              >
                <span className="grid size-10 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <Users className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.memberIds.length} members · {g.baseCurrency}
                  </p>
                </div>
                <ArrowUpRight className="ml-auto size-4" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-5 text-sm text-muted-foreground">
            No groups yet. Create your first group to get started.
          </p>
        )}
        <Button
          variant="outline"
          render={<Link to="/groups" />}
          nativeButton={false}
        >
          View all groups
          <ArrowUpRight />
        </Button>
      </Section>
    </div>
  )
}
