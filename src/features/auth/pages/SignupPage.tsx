import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LoaderCircle, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNotify } from '@/hooks/useNotify';
import { useAuthStore } from '@/stores/authStore';

import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const schema = z
  .object({
    displayName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(40, 'Name must be at most 40 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signup = useAuthStore((s) => s.signup);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const { enqueueSnackbar } = useNotify();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (profile) {
      navigate('/groups', { replace: true });
    }
  }, [profile, navigate]);

  const onSubmit = async (values: FormValues) => {
    clearError();
    try {
      await signup(values.email, values.password, values.displayName);
      enqueueSnackbar('Account created', { variant: 'success' });
    } catch {
      // error already set in store
    }
  };

  const busy = isSubmitting || status === 'loading';
  return (
    <AuthLayout
      title={t('Make room for sharing.')}
      description={t('Create your account and start your first group.')}
      footer={
        <>
          {t('Already have an account?')}{' '}
          <RouterLink
            to="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            {t('Sign in')}
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
            id="displayName"
            label={t('Full name')}
            type="text"
            autoComplete="name"
            placeholder={t('Your name')}
            {...register('displayName')}
            error={errors.displayName?.message}
          />
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
            autoComplete="new-password"
            placeholder={t('At least 6 characters')}
            {...register('password')}
            error={errors.password?.message}
          />
          <AuthField
            id="confirmPassword"
            label={t('Confirm password')}
            type="password"
            autoComplete="new-password"
            placeholder={t('Repeat your password')}
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
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
                {t('Creating account...')}
              </>
            ) : (
              <>
                {t('Create account')}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
}
