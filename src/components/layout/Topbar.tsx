import { ChevronDown, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotify } from '@/hooks/useNotify';
import { useAuthStore } from '@/stores/authStore';

import { Brand } from './Brand';
import { NAV_ITEMS } from './navigation';
import { ThemeToggle } from './ThemeToggle';

export default function Topbar({
  onToggleSidebar,
  sidebarExpanded,
  mobileExpanded,
}: {
  onToggleSidebar: () => void;
  sidebarExpanded: boolean;
  mobileExpanded: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const { enqueueSnackbar } = useNotify();
  const [signingOut, setSigningOut] = useState(false);
  const title = pathname.startsWith('/groups')
    ? 'Your groups'
    : pathname === '/settings'
      ? 'Settings'
      : pathname === '/ui-preview'
        ? 'UI reference'
        : 'Overview';
  const initials =
    profile?.displayName
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || 'U';
  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
      enqueueSnackbar('Signed out', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to sign out', { variant: 'error' });
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleSidebar}
        aria-label={t('Toggle navigation')}
        aria-expanded={sidebarExpanded}
        aria-controls="workspace-navigation"
      >
        <Menu aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onToggleSidebar}
        aria-label={t('Toggle navigation')}
        aria-expanded={mobileExpanded}
        aria-controls="mobile-workspace-navigation"
      >
        <Menu aria-hidden="true" />
      </Button>
      <Brand className="shrink-0 gap-2 [&>span:last-child]:text-lg sm:[&>span:last-child]:text-xl" />
      <p className="ml-4 hidden text-sm font-medium text-muted-foreground xl:block">
        {t(title)}
      </p>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="mx-1 hidden h-6 border-l sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="gap-2 px-1.5"
                aria-label={t('Account menu')}
              />
            }
          >
            <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials}
            </span>
            <span className="hidden max-w-28 truncate text-sm md:block">
              {profile?.displayName || t('Account')}
            </span>
            <ChevronDown
              className="hidden size-3 text-muted-foreground sm:block"
              aria-hidden="true"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-3 py-3">
              <p className="truncate text-sm font-semibold">
                {profile?.displayName || t('Your account')}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {profile?.email || t('Manage your workspace')}
              </p>
            </div>
            <DropdownMenuSeparator />
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <DropdownMenuItem
                key={to}
                render={<Link to={to} />}
                aria-current={
                  pathname === to || pathname.startsWith(`${to}/`)
                    ? 'page'
                    : undefined
                }
                className="min-h-10 px-3 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
              >
                <Icon aria-hidden="true" />
                {t(label)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void handleLogout()}
              disabled={signingOut}
              className="min-h-10 px-3"
            >
              <LogOut aria-hidden="true" />
              {signingOut ? t('Signing out...') : t('Sign out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
