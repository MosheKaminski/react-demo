import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from '@mui/material';
import { useAuth } from '../lib/useAuth';

export function LoginPage() {
  const { t } = useTranslation();
  const { session, signInWithPassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signInWithPassword(email, password);
    setSubmitting(false);
    if (signInError) {
      setError(t('auth.invalidCredentials'));
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Paper sx={{ p: 4, width: 360 }} component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Typography variant="h5">{t('app.title')}</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
