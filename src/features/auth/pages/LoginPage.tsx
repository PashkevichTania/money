import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/hooks/useNotify';
import { useAuthStore } from '@/stores/authStore';

import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const { enqueueSnackbar } = useNotify();

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (profile) {
      navigate(from, { replace: true });
    }
  }, [profile, navigate, from]);

  const onSubmit = async (values: FormValues) => {
    clearError();
    try {
      await login(values.email, values.password);
      enqueueSnackbar('Welcome back!', { variant: 'success' });
      navigate(from, { replace: true });
    } catch (error) {
      // error already set in store
      console.error(error);
    }
  };

  const busy = isSubmitting || status === 'loading';
  return (
    <AuthLayout
      title={t('Welcome back.')}
      description={t('Sign in to pick up where you left off.')}
      footer={
        <>
          {t('New to SmartMoney?')}{' '}
          <RouterLink
            to="/signup"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t('Create an account')}
          </RouterLink>
        </>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-6 pr-12">
          <AlertDescription>{t(error)}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1"
            onClick={clearError}
            aria-label={t('Dismiss error')}
          >
            <X aria-hidden="true" />
          </Button>
        </Alert>
      )}
      <GoogleSignInButton disabled={busy} />
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-busy={busy}
        className="space-y-5"
      >
        <fieldset disabled={busy} className="space-y-5">
          <AuthField
            id="email"
            label={t('Email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <AuthField
            id="password"
            label={t('Password')}
            type="password"
            autoComplete="current-password"
            placeholder={t('Enter your password')}
            {...register('password')}
            error={errors.password?.message}
          />
          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={busy}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" />
                {t('Signing in...')}
              </>
            ) : (
              <>
                {t('Sign in')}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
}
