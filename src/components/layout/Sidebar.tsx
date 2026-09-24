import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFriends } from '@/hooks/useFriends'
import { useCurrentUser } from '@/hooks/useGroups'
import { NAV_ITEMS } from './navigation'

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const me = useCurrentUser()
  const { items } = useFriends()
  const incoming = items.filter(item => item.status === 'pending' && item.recipientId === me?.id).length
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <nav aria-label={t('Main navigation')} className="px-3 pt-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t('Workspace')}
        </p>
        <div className="space-y-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {t(label)}
              {to === '/friends' && incoming > 0 && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{incoming}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="mt-auto px-6 py-6">
        <div className="border-t pt-5">
          <p className="text-sm font-medium">
            {t('Good company. Clear expenses.')}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {t('A little less keeping track.')}
            <br />
            {t('A little more living.')}
          </p>
          <NavLink
            to="/groups?new=1"
            onClick={onNavigate}
            className="mt-4 inline-flex items-center gap-1.5 rounded text-xs font-semibold text-positive"
          >
            {t('Start a group')}{' '}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </NavLink>
        </div>
      </div>
    </div>
  )
}
