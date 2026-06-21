import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, Typography, Box, CircularProgress } from '@mui/material';
import { useBranches } from '../features/branches/hooks';
import { useMonthlyTrend, useOrgMetrics } from '../features/dashboard/hooks';

interface OrgDashboardProps {
  year: number;
  month: number;
}

export function OrgDashboard({ year, month }: OrgDashboardProps) {
  const { t } = useTranslation();
  const { data: branches } = useBranches();
  const { data: orgMetrics, isLoading } = useOrgMetrics(year, month);
  const { data: trend } = useMonthlyTrend(6);

  const branchNameById = useMemo(
    () => new Map((branches ?? []).map((b) => [b.id, b.name])),
    [branches],
  );

  const maxCost = Math.max(1, ...(orgMetrics ?? []).map((m) => m.laborCost));
  const maxTrend = Math.max(1, ...(trend ?? []).map((m) => m.laborCost));

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="subtitle1">{t('dashboard.costComparison')}</Typography>
        {isLoading ? (
          <CircularProgress />
        ) : (orgMetrics ?? []).length === 0 ? (
          <Typography color="text.secondary">{t('dashboard.noBranches')}</Typography>
        ) : (
          <Stack spacing={1}>
            {(orgMetrics ?? []).map((m) => (
              <Stack key={m.branchId} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ minWidth: 140 }}>
                  {branchNameById.get(m.branchId) ?? m.branchId}
                </Typography>
                <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', borderRadius: 1, height: 16 }}>
                  <Box
                    sx={{
                      width: `${(m.laborCost / maxCost) * 100}%`,
                      bgcolor: 'primary.main',
                      height: 16,
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
                  {m.laborCost.toFixed(2)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle1">{t('dashboard.monthlyTrend')}</Typography>
        <Stack spacing={1}>
          {(trend ?? []).map((m) => (
            <Stack key={`${m.year}-${m.month}`} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                {m.month}/{m.year}
              </Typography>
              <Box sx={{ flexGrow: 1, bgcolor: 'grey.200', borderRadius: 1, height: 16 }}>
                <Box
                  sx={{
                    width: `${(m.laborCost / maxTrend) * 100}%`,
                    bgcolor: 'secondary.main',
                    height: 16,
                    borderRadius: 1,
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
                {m.laborCost.toFixed(2)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}
