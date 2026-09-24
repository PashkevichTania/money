import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { CurrencySelect, Field, Message } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { DEFAULT_BASE_CURRENCY } from '@/config/currencies';
import { useFriends } from '@/hooks/useFriends';
import { useCurrentUser } from '@/hooks/useGroups';
import { useNotify } from '@/hooks/useNotify';
import { useGroupStore } from '@/stores/groupStore';

const schema = z.object({
  name: z
    .string()
    .min(2, 'Group name must be at least 2 characters')
    .max(60, 'Group name must be at most 60 characters'),
  baseCurrency: z.string().min(3, 'Please select a currency'),
});

type FormValues = z.infer<typeof schema>;

export default function CreateGroupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const me = useCurrentUser();
  const navigate = useNavigate();
  const createGroupAndSelect = useGroupStore((s) => s.createGroupAndSelect);
  const addMemberByEmail = useGroupStore((s) => s.addMemberByEmail);
  const {
    friends,
    loading: loadingFriends,
    error: friendsError,
  } = useFriends();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const loading = useGroupStore((s) => s.loading);
  const errors = useGroupStore((s) => s.errors);
  const clearErrors = useGroupStore((s) => s.clearErrors);
  const { enqueueSnackbar } = useNotify();
  const [localError, setLocalError] = useState<string | null>(null);

  const [previousOpen, setPreviousOpen] = useState(open);
  if (previousOpen !== open) {
    setPreviousOpen(open);
    setSelectedIds([]);
    setQuery('');
    setLocalError(null);
  }

  const defaultCurrency = me?.defaultCurrency || DEFAULT_BASE_CURRENCY;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors: formErrors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', baseCurrency: defaultCurrency },
  });

  useEffect(() => {
    if (open) {
      clearErrors();
      reset({ name: '', baseCurrency: defaultCurrency });
    }
  }, [open, defaultCurrency, reset, clearErrors]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!me) {
        setLocalError('You must be signed in to create a group');
        return;
      }
      setLocalError(null);
      clearErrors();
      try {
        const group = await createGroupAndSelect({
          name: values.name,
          baseCurrency: values.baseCurrency,
          memberIds: [me.id],
          createdBy: me.id,
        });
        const failedNames: string[] = [];
        for (const friend of friends.filter((friend) =>
          selectedIds.includes(friend.id)
        )) {
          try {
            await addMemberByEmail(group.id, friend.email);
          } catch {
            failedNames.push(friend.displayName || friend.email);
          }
        }
        if (failedNames.length) {
          enqueueSnackbar(
            t(
              'Group created, but these friends could not be added: {{names}}. Try again in Members.',
              { names: failedNames.join(', ') }
            ),
            { variant: 'warning' }
          );
        } else {
          enqueueSnackbar(t('Group "{{name}}" created', { name: group.name }), {
            variant: 'success',
          });
        }
        onClose();
        navigate(`/groups/${group.id}`, { replace: true });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to create group';
        setLocalError(msg);
        enqueueSnackbar(msg, { variant: 'error' });
      }
    },
    [
      me,
      friends,
      selectedIds,
      addMemberByEmail,
      createGroupAndSelect,
      clearErrors,
      enqueueSnackbar,
      onClose,
      navigate,
      t,
    ]
  );

  const search = query.trim().toLowerCase();
  const availableFriends = friends.filter((friend) =>
    `${friend.displayName} ${friend.email}`.toLowerCase().includes(search)
  );
  const busy = isSubmitting || loading;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('Create a group')}
      description={t('Give your shared plans a place of their own.')}
      busy={busy}
    >
      {(localError || errors.groups) && (
        <Message error>{localError || errors.groups}</Message>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <fieldset disabled={busy} className="space-y-5">
          <Field
            label={t('Group name')}
            placeholder={t('e.g. Weekend in Lisbon')}
            {...register('name')}
            error={formErrors.name?.message}
          />
          <Controller
            control={control}
            name="baseCurrency"
            render={({ field }) => (
              <CurrencySelect
                label={t('Base currency')}
                value={field.value}
                name={field.name}
                onBlur={field.onBlur}
                onValueChange={field.onChange}
              />
            )}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            {t(
              'This currency is fixed once the group is created. Expenses in other currencies will be converted to it.'
            )}
          </p>
          <section className="space-y-3" aria-label={t('Members')}>
            <div>
              <h3 className="text-sm font-medium">{t('Members')}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  'Choose friends now or add them later. You are included automatically.'
                )}
              </p>
            </div>
            {friendsError ? (
              <Message error>{friendsError}</Message>
            ) : loadingFriends ? (
              <p role="status" className="text-sm text-muted-foreground">
                {t('Loading...')}
              </p>
            ) : friends.length ? (
              <>
                <Field
                  label={t('Find a friend')}
                  placeholder={t('Name or email')}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('Selected friends: {{count}}', {
                    count: selectedIds.filter((id) =>
                      friends.some((friend) => friend.id === id)
                    ).length,
                  })}
                </p>
                <ul
                  aria-label={t('Friends')}
                  className="max-h-48 overflow-y-auto divide-y rounded-md border"
                >
                  {availableFriends.map((friend) => (
                    <li key={friend.id}>
                      <label className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={selectedIds.includes(friend.id)}
                          onChange={(event) =>
                            setSelectedIds((ids) =>
                              event.target.checked
                                ? [...ids, friend.id]
                                : ids.filter((id) => id !== friend.id)
                            )
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {friend.displayName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {friend.email}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                {!availableFriends.length && (
                  <p className="text-sm text-muted-foreground">
                    {t('No available friends')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  'No friends yet. You can add members after creating the group.'
                )}
              </p>
            )}
          </section>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit">
              {busy ? t('Creating...') : t('Create group')}
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
