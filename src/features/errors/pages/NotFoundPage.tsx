import { ArrowLeft, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Brand } from '@/components/layout/Brand';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="bg-workspace flex min-h-dvh flex-col p-6 sm:p-8">
      <Brand />
      <section className="mx-auto grid w-full max-w-3xl flex-1 place-items-center py-16 text-center">
        <div>
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <SearchX className="size-8" aria-hidden="true" />
          </span>
          <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-positive">
            {t('Page not found')}
          </p>
          <h1 className="mt-2 text-7xl font-semibold tracking-[-0.06em] sm:text-8xl">
            404
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">
            {t(
              'The page you are looking for does not exist or may have been moved.'
            )}
          </p>
          <Button className="mt-8" size="lg" render={<Link to="/dashboard" />}>
            <ArrowLeft aria-hidden="true" />
            {t('Back to dashboard')}
          </Button>
        </div>
      </section>
    </main>
  );
}
