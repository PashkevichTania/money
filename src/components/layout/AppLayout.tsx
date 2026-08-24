import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import { useUIStore } from '@/stores/uiStore'
import { useThemeModeListener } from '@/providers/AppProviders'

export default function AppLayout() {
  useThemeModeListener()
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 900) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Topbar
        onToggleSidebar={() => {
          if (window.innerWidth < 900) {
            setMobileOpen((v) => !v)
          } else {
            toggleSidebar()
          }
        }}
      />
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          width: '100%',
          mt: { xs: 0, md: 0 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
