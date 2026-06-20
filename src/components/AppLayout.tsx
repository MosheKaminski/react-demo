import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Button, Container, Box, Typography } from '@mui/material';
import { useAuth } from '../lib/useAuth';

interface AppLayoutProps {
  children: ReactNode;
  language: string;
  onToggleLanguage: () => void;
}

export function AppLayout({ children, language, onToggleLanguage }: AppLayoutProps) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {t('app.title')}
          </Typography>
          <Button component={RouterLink} to="/">
            {t('nav.dashboard')}
          </Button>
          {profile?.role === 'admin' && (
            <Button component={RouterLink} to="/branches">
              {t('nav.branches')}
            </Button>
          )}
          {(profile?.role === 'admin' || profile?.role === 'branch_manager') && (
            <Button component={RouterLink} to="/employees">
              {t('nav.employees')}
            </Button>
          )}
          <Button component={RouterLink} to="/attendance">
            {t('nav.attendance')}
          </Button>
          <Button component={RouterLink} to="/shifts">
            {t('nav.shifts')}
          </Button>
          {profile?.role === 'admin' && (
            <Button component={RouterLink} to="/payroll">
              {t('nav.payroll')}
            </Button>
          )}
          <Button component={RouterLink} to="/me">
            {t('nav.myProfile')}
          </Button>
          <Button onClick={onToggleLanguage}>{language === 'he' ? 'English' : 'עברית'}</Button>
          <Button onClick={() => signOut()}>{t('nav.logout')}</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>{children}</Container>
    </Box>
  );
}
