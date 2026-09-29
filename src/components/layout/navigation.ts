import {
  ArrowLeftRight,
  LayoutDashboard,
  Network,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { to: '/debts', label: 'Debt graph', Icon: Network },
  { to: '/balances', label: 'All balances', Icon: Wallet },
  { to: '/groups', label: 'Your groups', Icon: Users },
  { to: '/friends', label: 'Friends', Icon: Users },
  { to: '/rates', label: 'Exchange rates', Icon: ArrowLeftRight },
  { to: '/settings', label: 'Settings', Icon: Settings },
];
