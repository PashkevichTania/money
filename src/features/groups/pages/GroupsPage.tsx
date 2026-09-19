import { Link, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { Plus, Users, ArrowUpRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Message } from '@/components/ui/field'
import { useGroups } from '@/hooks/useGroups'
import { useGroupStore } from '@/stores/groupStore'
import CreateGroupDialog from '../components/CreateGroupDialog'
export default function GroupsPage() {
  const { groups, loading } = useGroups()
  const error = useGroupStore((s) => s.errors.groups)
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const close = () => {
    setOpen(false)
    const next = new URLSearchParams(params)
    next.delete('new')
    setParams(next, { replace: true })
  }
  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-positive">
            Shared spaces
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Your groups</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Trips, everyday things and everything you share.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          New group
        </Button>
      </header>
      {error && <Message error>{error}</Message>}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-3 size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          className="bg-card pl-10"
          aria-label="Search groups"
          placeholder="Find a group..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading && !groups.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-md" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <Link
              to={`/groups/${g.id}`}
              key={g.id}
              className="group rounded-md border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <div className="flex justify-between">
                <span className="grid size-11 place-items-center rounded-md bg-secondary text-secondary-foreground">
                  <Users className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5" />
              </div>
              <h2 className="mt-6 truncate text-lg font-semibold">{g.name}</h2>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>{g.memberIds.length} members</span>
                <span className="rounded-md border px-2 py-1 text-xs">
                  {g.baseCurrency}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-card p-10 text-center">
          <Users className="mx-auto mb-4 size-8 text-positive" />
          <h2 className="font-semibold">
            {query ? 'No matching groups' : 'Your next shared plan starts here'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {query
              ? 'Try another name.'
              : 'Create a group, add your people and start recording expenses.'}
          </p>
          {!query && (
            <Button className="mt-5" onClick={() => setOpen(true)}>
              Create your first group
            </Button>
          )}
        </div>
      )}
      <CreateGroupDialog
        open={open || params.get('new') === '1'}
        onClose={close}
      />
    </div>
  )
}
