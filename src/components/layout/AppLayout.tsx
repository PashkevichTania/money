import { useTranslation } from 'react-i18next'
import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import { useUIStore } from '@/stores/uiStore'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

export default function AppLayout() {
  const { t } = useTranslation()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [mobileOpen, setMobileOpen] = useState(false)
  const toggleElement = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onResize = () => {
      if (query.matches) setMobileOpen(false)
    }
    query.addEventListener('change', onResize)
    return () => query.removeEventListener('change', onResize)
  }, [])
  return (
    <div className="bg-workspace min-h-dvh">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0"
      >
        {t('Skip to content')}
      </a>
      <Topbar
        sidebarExpanded={sidebarOpen}
        mobileExpanded={mobileOpen}
        onToggleSidebar={() => {
          if (window.matchMedia('(min-width: 1024px)').matches)
            toggleSidebar()
          else {
            toggleElement.current = document.activeElement as HTMLElement
            setMobileOpen((v) => !v)
          }
        }}
      />
      <div className="flex">
        {sidebarOpen && (
          <aside
            id="workspace-navigation"
            className="sticky top-20 hidden h-[calc(100dvh-5rem)] w-64 shrink-0 border-r lg:block"
          >
            <Sidebar />
          </aside>
        )}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            finalFocus={toggleElement}
            className="w-72 gap-0 p-0"
            id="mobile-workspace-navigation"
          >
            <SheetTitle className="sr-only">
              {t('Workspace navigation')}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t('Navigate between your overview, groups and settings.')}
            </SheetDescription>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1440px] p-4 outline-none sm:p-8 lg:p-10"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
