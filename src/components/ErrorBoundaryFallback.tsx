import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export function ErrorBoundaryFallback() {
  const { t } = useTranslation();

  return (
    <main className="bg-workspace grid min-h-dvh place-items-center p-6">
      <section className="w-full max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-destructive">
          {t('Unexpected error')}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t('Something went wrong')}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {t(
            'The application ran into an unexpected problem. Reload the page or return to the dashboard.'
          )}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => window.location.reload()}>
            {t('Reload page')}
          </Button>
          <Button variant="outline" render={<a href="/dashboard" />}>
            {t('Back to dashboard')}
          </Button>
        </div>
      </section>
    </main>
  );
}
