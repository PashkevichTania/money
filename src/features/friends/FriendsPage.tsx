import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { respondToFriendship, sendFriendRequest } from '@/api/friends';
import { Button } from '@/components/ui/button';
import { Field, Message, Section } from '@/components/ui/field';
import { useFriends } from '@/hooks/useFriends';
import { useCurrentUser } from '@/hooks/useGroups';

export default function FriendsPage() {
  const { t } = useTranslation();
  const me = useCurrentUser();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { items, profiles, loading, error: loadError } = useFriends();
  async function perform(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-7">
      <h1 className="text-3xl font-semibold">{t('Friends')}</h1>
      <Section
        title={t('Add a friend')}
        description={t(
          'Friends can add you to their groups without another invitation.'
        )}
      >
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void perform(async () => {
              await sendFriendRequest(email);
              setEmail('');
            }, t('Friend request sent'));
          }}
        >
          <Field
            wrapperClassName={'max-w-[350px] w-full'}
            label={t('Email')}
            type="email"
            required
            value={email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
          />
          <Button disabled={busy || !email.trim()} type="submit">
            {t('Send friend request')}
          </Button>
        </form>
        {(error || loadError) && (
          <Message error>{t(error || loadError)}</Message>
        )}
        {message && (
          <p role="status" className="text-sm text-positive">
            {message}
          </p>
        )}
      </Section>
      {loading && <p role="status">{t('Loading...')}</p>}
      {(['incoming', 'outgoing', 'friends'] as const).map((section) => {
        const rows = items.filter((item) =>
          section === 'friends'
            ? item.status === 'accepted'
            : item.status === 'pending' &&
              (section === 'incoming'
                ? item.recipientId === me?.id
                : item.senderId === me?.id)
        );
        return (
          <Section
            key={section}
            title={t(
              section === 'incoming'
                ? 'Incoming requests'
                : section === 'outgoing'
                  ? 'Sent requests'
                  : 'Friends'
            )}
          >
            {!loading && !rows.length && (
              <p className="text-sm text-muted-foreground">
                {t('No people here yet')}
              </p>
            )}
            {rows.map((item) => {
              const otherId = item.memberIds.find((id) => id !== me?.id);
              const profile = profiles.find((person) => person.id === otherId);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
                >
                  <div>
                    <p className="font-medium">
                      {profile?.displayName || t('Loading member')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {section === 'incoming' && (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          void perform(
                            () => respondToFriendship(item.id, 'accept'),
                            t('Friend request accepted')
                          )
                        }
                      >
                        {t('Accept')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void perform(
                          () => respondToFriendship(item.id, 'remove'),
                          t('Friend list updated')
                        )
                      }
                    >
                      {t(
                        section === 'incoming'
                          ? 'Decline'
                          : section === 'outgoing'
                            ? 'Cancel request'
                            : 'Remove friend'
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </Section>
        );
      })}
      <p className="text-sm text-muted-foreground">
        {t('Removing a friend keeps your existing groups and expense history.')}
      </p>
    </div>
  );
}
