import { useTranslation } from 'react-i18next';
import { Grid, Paper, Typography, CircularProgress } from '@mui/material';
import { useBranchMetrics } from '../features/dashboard/hooks';

interface BranchDashboardProps {
  branchId: string;
  year: number;
  month: number;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5">{value}</Typography>
    </Paper>
  );
}

export function BranchDashboard({ branchId, year, month }: BranchDashboardProps) {
  const { t } = useTranslation();
  const { data: metrics, isLoading } = useBranchMetrics(branchId, year, month);

  if (isLoading || !metrics) return <CircularProgress />;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard label={t('dashboard.headcount')} value={metrics.headcount} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard label={t('dashboard.regularHours')} value={metrics.regularHours} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard label={t('dashboard.overtimeHours')} value={metrics.overtimeHours} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard label={t('dashboard.laborCost')} value={metrics.laborCost.toFixed(2)} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard label={t('dashboard.pendingApprovals')} value={metrics.pendingApprovals} />
      </Grid>
    </Grid>
  );
}
