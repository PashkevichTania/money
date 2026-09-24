import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from 'react-router-dom';

import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/features/auth/pages/LoginPage';
import SignupPage from '@/features/auth/pages/SignupPage';
import BalancesPage from '@/features/balances/pages/BalancesPage';
import DashboardPage from '@/features/dashboard/pages/DashboardPage';
import UiPreviewPage from '@/features/design/UiPreviewPage';
import FriendsPage from '@/features/friends/FriendsPage';
import GroupDetailPage from '@/features/groups/pages/GroupDetailPage';
import GroupsPage from '@/features/groups/pages/GroupsPage';
import SettingsPage from '@/features/settings/pages/SettingsPage';

import { ProtectedRoute } from './ProtectedRoute';

const router = createBrowserRouter([
  ...(import.meta.env.DEV
    ? [
        {
          path: '/ui-preview',
          element: <AppLayout />,
          children: [{ index: true, element: <UiPreviewPage /> }],
        },
      ]
    : []),
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
      { path: 'balances', element: <BalancesPage /> },
      { path: 'groups', element: <GroupsPage /> },
      { path: 'groups/:id', element: <GroupDetailPage /> },
      { path: 'friends', element: <FriendsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
