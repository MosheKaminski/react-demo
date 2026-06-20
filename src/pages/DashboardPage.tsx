import { useTranslation } from 'react-i18next';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useAuth } from '../lib/useAuth';

export function DashboardPage() {
  const { t } = useTranslation();
  const { session, profile, signOut } = useAuth();

  return (
    <Box>
      <Stack spacing={2}>
        <Typography variant="h5">{t('nav.dashboard')}</Typography>
        {session && (
          <Typography>{t('auth.loggedInAs', { email: session.user.email })}</Typography>
        )}
        {profile && (
          <Typography>
            {t('auth.role')}: {profile.role}
          </Typography>
        )}
        <Button variant="outlined" onClick={() => signOut()} sx={{ alignSelf: 'flex-start' }}>
          {t('nav.logout')}
        </Button>
      </Stack>
    </Box>
  );
}
