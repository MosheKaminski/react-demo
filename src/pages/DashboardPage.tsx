import { useTranslation } from 'react-i18next';
import { Stack, Typography } from '@mui/material';
import { useAuth } from '../lib/useAuth';
import { useEmployeeByUserId } from '../features/employees/hooks';
import { useManagedBranch } from '../features/branches/hooks';
import { BranchDashboard } from '../components/BranchDashboard';
import { OrgDashboard } from '../components/OrgDashboard';

export function DashboardPage() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const { data: employee } = useEmployeeByUserId(session?.user.id);
  const { data: managedBranch } = useManagedBranch(employee?.id);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <Stack spacing={3}>
      <Typography variant="h5">{t('nav.dashboard')}</Typography>
      {session && <Typography>{t('auth.loggedInAs', { email: session.user.email })}</Typography>}
      {profile && (
        <Typography>
          {t('auth.role')}: {profile.role}
        </Typography>
      )}

      {profile?.role === 'branch_manager' && managedBranch && (
        <Stack spacing={2}>
          <Typography variant="subtitle1">
            {t('dashboard.branchDashboard')} — {managedBranch.name}
          </Typography>
          <BranchDashboard branchId={managedBranch.id} year={year} month={month} />
        </Stack>
      )}

      {profile?.role === 'admin' && (
        <Stack spacing={2}>
          <Typography variant="subtitle1">{t('dashboard.orgDashboard')}</Typography>
          <OrgDashboard year={year} month={month} />
        </Stack>
      )}
    </Stack>
  );
}
