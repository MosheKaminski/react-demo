import { useTranslation } from 'react-i18next';
import { Stack, Typography, CircularProgress, Paper } from '@mui/material';
import { useAuth } from '../lib/useAuth';
import { useBranches } from '../features/branches/hooks';
import { useEmployeeByUserId } from '../features/employees/hooks';

export function MyProfilePage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: employee, isLoading } = useEmployeeByUserId(session?.user.id);
  const { data: branches } = useBranches();

  if (isLoading) return <CircularProgress />;

  if (!employee) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">{t('myProfile.title')}</Typography>
        <Typography>{t('myProfile.noEmployeeRecord')}</Typography>
      </Stack>
    );
  }

  const branchName = branches?.find((b) => b.id === employee.primary_branch_id)?.name ?? '—';

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('myProfile.title')}</Typography>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography>
            {t('employees.fullName')}: {employee.full_name}
          </Typography>
          <Typography>
            {t('common.phone')}: {employee.phone ?? '—'}
          </Typography>
          <Typography>
            {t('common.email')}: {employee.email ?? '—'}
          </Typography>
          <Typography>
            {t('employees.primaryBranch')}: {branchName}
          </Typography>
          <Typography>
            {t('employees.startDate')}: {employee.start_date}
          </Typography>
        </Stack>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1">{t('myProfile.paySummary')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('myProfile.paySummaryPlaceholder')}
        </Typography>
      </Paper>
    </Stack>
  );
}
