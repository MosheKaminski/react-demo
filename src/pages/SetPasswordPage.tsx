import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Box, Button, Paper, Stack, TextField, Typography, Alert } from '@mui/material';
import { useAuth } from '../lib/useAuth';
import { supabase } from '../lib/supabaseClient';

export function SetPasswordPage() {
  const { t } = useTranslation();
  const { session, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (!passwordRecovery) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    clearPasswordRecovery();
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Paper sx={{ p: 4, width: 360 }} component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Typography variant="h5">{t('auth.setPasswordTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('auth.setPasswordSubtitle')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={t('auth.newPassword')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            slotProps={{ htmlInput: { minLength: 6 } }}
          />
          <TextField
            label={t('auth.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? t('auth.savingPassword') : t('auth.savePassword')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
