import { useTranslation } from 'react-i18next';
import { Stack, Typography } from '@mui/material';
import { useAuth } from '../lib/useAuth';

export function DashboardPage() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('nav.dashboard')}</Typography>
      {session && <Typography>{t('auth.loggedInAs', { email: session.user.email })}</Typography>}
      {profile && (
        <Typography>
          {t('auth.role')}: {profile.role}
        </Typography>
      )}
    </Stack>
  );
}
