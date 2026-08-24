import { NavLink as RouterLink, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import DashboardIcon from '@mui/icons-material/Dashboard'
import GroupsIcon from '@mui/icons-material/Groups'
import SettingsIcon from '@mui/icons-material/Settings'
import { useUIStore } from '@/stores/uiStore'

const SIDEBAR_WIDTH = 260

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/groups', label: 'Groups', Icon: GroupsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

interface SidebarProps {
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const location = useLocation()

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.14em' }}>
          Main Menu
        </Typography>
      </Toolbar>
      <List sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const active = to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <ListItem key={to} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={to}
                selected={active}
                onClick={onCloseMobile}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: (t) => t.palette.primary.main + '1a',
                    color: (t) => t.palette.primary.main,
                    '& .MuiListItemIcon-root': {
                      color: (t) => t.palette.primary.main,
                    },
                  },
                  '&:hover': {
                    bgcolor: (t) => t.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {label}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      <Box sx={{ mt: 'auto', p: 2.5 }}>
        <Box
          sx={{
            borderRadius: 3,
            p: 2.5,
            bgcolor: (t) =>
              t.palette.mode === 'dark' ? t.palette.primary.dark + '4d' : t.palette.primary.main + '14',
            border: (t) => `1px solid ${t.palette.primary.main}33`,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Multi-currency splits
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5, color: 'text.secondary' }}>
            Add expenses in any currency. Everything converts to your group base.
          </Typography>
        </Box>
      </Box>
    </Box>
  )

  return (
    <>
      <Box
        sx={{
          width: { md: sidebarOpen ? SIDEBAR_WIDTH : 0 },
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          transition: (t) => t.transitions.create('width'),
        }}
      />
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: (t) => `1px solid ${t.palette.divider}`,
            transform: sidebarOpen ? 'translateX(0)' : `translateX(-${SIDEBAR_WIDTH}px)`,
            transition: (t) => t.transitions.create('transform'),
            visibility: sidebarOpen ? 'visible' : 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  )
}
