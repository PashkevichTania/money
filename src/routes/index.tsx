import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'
import LoginPage from '@/features/auth/pages/LoginPage'
import SignupPage from '@/features/auth/pages/SignupPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import GroupsPage from '@/features/groups/pages/GroupsPage'
import GroupDetailPage from '@/features/groups/pages/GroupDetailPage'
import UiPreviewPage from '@/features/design/UiPreviewPage'
import SettingsPage from '@/features/settings/pages/SettingsPage'

const router = createBrowserRouter([
  ...(import.meta.env.DEV ? [{ path: '/ui-preview', element: <AppLayout />, children: [{ index: true, element: <UiPreviewPage /> }] }] : []),
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'groups/:id', element: <GroupDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
