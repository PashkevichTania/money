import { LayoutDashboard, Users, Settings, Wallet } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { to: '/balances', label: 'All balances', Icon: Wallet },
  { to: '/groups', label: 'Your groups', Icon: Users },
  { to: '/settings', label: 'Settings', Icon: Settings },
]
