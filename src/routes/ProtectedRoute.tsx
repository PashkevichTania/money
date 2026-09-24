import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const initialized = useAuthStore((s) => s.initialized);
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (!initialized || status === 'loading') {
    return (
      <div
        role="status"
        className="grid min-h-dvh place-content-center justify-items-center gap-4 text-sm text-muted-foreground"
      >
        <LoaderCircle
          className="size-6 animate-spin text-primary"
          aria-hidden="true"
        />
        {t('Loading SplitSmart...')}
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
