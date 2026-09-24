import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isFirebaseConfigured } from '@/config/firebase';
import { useNotify } from '@/hooks/useNotify';
import { AppProviders } from '@/providers/AppProviders';
import { AppRouter } from '@/routes';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

function AuthInit() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => init(), [init]);
  return null;
}

function UIStoreSnackbridge() {
  const toast = useUIStore((s) => s.toast);
  const clearToast = useUIStore((s) => s.clearToast);
  const { enqueueSnackbar } = useNotify();

  useEffect(() => {
    if (!toast) return;
    enqueueSnackbar(toast.message, {
      variant: toast.variant === 'warning' ? 'warning' : toast.variant,
    });
    clearToast();
  }, [toast, clearToast, enqueueSnackbar]);

  return null;
}

function FirebaseNotice() {
  const { t } = useTranslation();
  if (isFirebaseConfigured) return null;
  return (
    <div className="border-b bg-warning/15 p-4">
      <Alert className="mx-auto max-w-3xl border-warning/50 bg-transparent">
        <AlertTitle>{t('Workspace connection is not configured')}</AlertTitle>
        <AlertDescription>
          {t(
            'Add the Firebase configuration in your environment to enable sign-in and shared expenses.'
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AuthInit />
      <UIStoreSnackbridge />
      <FirebaseNotice />
      <AppRouter />
    </AppProviders>
  );
}
