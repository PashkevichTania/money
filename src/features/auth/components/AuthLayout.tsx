import { ArrowUpRight, Check, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSelect } from '@/components/LanguageSelect';
import { Brand } from '@/components/layout/Brand';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { formatMoney } from '@/utils/currency';

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      <aside className="bg-workspace relative hidden flex-col overflow-hidden bg-[#0c4137] dark:bg-[#101012] p-12 text-white lg:flex xl:p-16">
        <Brand
          to="/login"
          className="text-white [&>span:first-child]:bg-white/10 [&>span:first-child]:text-[#81e2bd]"
        />
        <div className="my-auto max-w-lg py-16">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[#a7d5c5]">
            {t('Shared moments. Simple splits.')}
          </p>
          <h2 className="text-5xl font-semibold leading-[1.12] tracking-[-0.045em] xl:text-6xl">
            {t('Life is better')}
            <br />
            {t('shared.')}
            <br />
            <span className="text-[#81e2bd]">{t('So are expenses.')}</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-[#c0d8cf]">
            {t(
              'From a weekend away to everyday things. Keep your shared expenses together, and the math out of the way.'
            )}
          </p>
          <div className="mt-10 max-w-sm rounded-md border border-white/15 bg-white/[0.06] p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#a7d5c5]">
                {t('A simple split')}
              </span>
              <Users className="size-4 text-[#81e2bd]" aria-hidden="true" />
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <span className="font-medium">{t('Dinner with friends')}</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatMoney(84, 'EUR')}
              </span>
            </div>
            <div className="my-5 border-t border-dashed border-white/20" />
            <div className="flex items-center gap-2 text-sm text-[#c0d8cf]">
              <Check className="size-4 text-[#81e2bd]" aria-hidden="true" />
              {t('3 friends')}
              <span className="ml-auto font-medium text-white">
                {t('{{amount}} each', { amount: formatMoney(28, 'EUR') })}
              </span>
            </div>
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-[#a7d5c5]">
          {t('Less keeping track. More making plans.')}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </p>
      </aside>
      <section className="flex min-h-dvh flex-col bg-card px-6 sm:px-12">
        <div className="flex h-24 shrink-0 items-center justify-between">
          <div className="lg:invisible">
            <Brand to="/login" />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelect compact />
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-positive">
            {t('Your shared workspace')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {children}
          <div className="mt-7 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </div>
        <p className="py-7 text-center text-xs text-muted-foreground">
          {t('Made for the things you share.')}
        </p>
      </section>
    </div>
  );
}
