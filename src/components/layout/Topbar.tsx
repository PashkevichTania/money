import { useMemo, useState, type MouseEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import MenuIcon from '@mui/icons-material/Menu'
import Logout from '@mui/icons-material/Logout'
import Settings from '@mui/icons-material/Settings'
import Person from '@mui/icons-material/Person'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useAuthStore } from '@/stores/authStore'
import { useApp } from '@/providers/AppProviders'
import { useSnackbar } from 'notistack'

interface TopbarProps {
  onToggleSidebar: () => void
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const logout = useAuthStore((s) => s.logout)
  const { themeMode, toggleTheme } = useApp()
  const { enqueueSnackbar } = useSnackbar()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const avatarText = useMemo(() => {
    if (profile?.displayName) {
      const parts = profile.displayName.trim().split(/\s+/)
      return (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
    }
    return profile?.email?.[0]?.toUpperCase() || 'U'
  }, [profile])

  const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleCloseUserMenu = () => setAnchorEl(null)

  const handleLogout = async () => {
    handleCloseUserMenu()
    try {
      await logout()
      enqueueSnackbar('Signed out', { variant: 'success' })
      navigate('/login', { replace: true })
    } catch {
      enqueueSnackbar('Failed to sign out', { variant: 'error' })
    }
  }

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        borderBottom: (t) => `1px solid ${t.palette.divider}`,
        zIndex: (t) => t.zIndex.drawer + 1,
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          size="large"
          onClick={onToggleSidebar}
          sx={{ mr: 2, display: { md: 'none' } }}
          aria-label="Toggle sidebar"
        >
          <MenuIcon />
        </IconButton>
        <Box
          component={RouterLink}
          to="/dashboard"
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              background: (t) => t.palette.primary.main,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              mr: 1.5,
            }}
          >
            $
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            SplitSmart
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title={themeMode === 'light' ? 'Switch to dark' : 'Switch to light'}>
          <IconButton onClick={toggleTheme} color="default" sx={{ mr: 1 }}>
            {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={profile?.displayName || 'Account'}>
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar sx={{ bgcolor: (t) => t.palette.secondary.main, fontWeight: 700 }}>
                {avatarText.toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseUserMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" noWrap>
                {profile?.displayName || 'User'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                {profile?.email || ''}
              </Typography>
            </Box>
            <Divider />
            <MenuItem component={RouterLink} to="/settings" onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <MenuItem component={RouterLink} to="/dashboard" onClick={handleCloseUserMenu}>
              <ListItemIcon>
                <Person fontSize="small" />
              </ListItemIcon>
              <ListItemText>Dashboard</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sign out</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
        <Button
          component={RouterLink}
          to="/groups"
          variant="contained"
          color="primary"
          size="small"
          sx={{ ml: 2 }}
        >
          New Group
        </Button>
      </Toolbar>
    </AppBar>
  )
}
