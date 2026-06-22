import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Stack, Typography, TextField, Button, Paper, CircularProgress } from '@mui/material';
import { useOvertimePolicy, useUpdateOvertimePolicy } from '../features/payroll/hooks';
import type { OvertimePolicy } from '../types/domain';

function OvertimePolicyForm({ policy }: { policy: OvertimePolicy }) {
  const { t } = useTranslation();
  const updatePolicy = useUpdateOvertimePolicy();

  const [dailyRegularHours, setDailyRegularHours] = useState(String(policy.daily_regular_hours));
  const [daily125Hours, setDaily125Hours] = useState(String(policy.daily_125_hours));
  const [rate125, setRate125] = useState(String(policy.rate_125));
  const [rate150, setRate150] = useState(String(policy.rate_150));
  const [weekendHolidayRate, setWeekendHolidayRate] = useState(String(policy.weekend_holiday_rate));

  const handleSave = () => {
    updatePolicy.mutate({
      id: policy.id,
      input: {
        daily_regular_hours: Number(dailyRegularHours),
        daily_125_hours: Number(daily125Hours),
        rate_125: Number(rate125),
        rate_150: Number(rate150),
        weekend_holiday_rate: Number(weekendHolidayRate),
      },
    });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1">{t('payroll.overtimePolicy')}</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 2,
        }}
      >
        <TextField
          label={t('payroll.dailyRegularHours')}
          type="number"
          size="small"
          value={dailyRegularHours}
          onChange={(e) => setDailyRegularHours(e.target.value)}
        />
        <TextField
          label={t('payroll.daily125Hours')}
          type="number"
          size="small"
          value={daily125Hours}
          onChange={(e) => setDaily125Hours(e.target.value)}
        />
        <TextField
          label={t('payroll.rate125')}
          type="number"
          size="small"
          value={rate125}
          onChange={(e) => setRate125(e.target.value)}
        />
        <TextField
          label={t('payroll.rate150')}
          type="number"
          size="small"
          value={rate150}
          onChange={(e) => setRate150(e.target.value)}
        />
        <TextField
          label={t('payroll.weekendHolidayRate')}
          type="number"
          size="small"
          value={weekendHolidayRate}
          onChange={(e) => setWeekendHolidayRate(e.target.value)}
        />
      </Box>
      <Button
        variant="outlined"
        onClick={handleSave}
        disabled={updatePolicy.isPending}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('payroll.savePolicy')}
      </Button>
    </Stack>
  );
}

export function OvertimePolicySettings() {
  const { data: policy } = useOvertimePolicy();

  return (
    <Paper sx={{ p: 3 }}>
      {policy ? <OvertimePolicyForm key={policy.id} policy={policy} /> : <CircularProgress />}
    </Paper>
  );
}
