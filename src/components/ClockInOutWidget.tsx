import { useTranslation } from 'react-i18next';
import { Paper, Stack, Typography, Button, CircularProgress } from '@mui/material';
import { useClockIn, useClockOut, useOpenAttendance } from '../features/attendance/hooks';
import { getCurrentPositionSafe } from '../lib/geolocation';
import type { Employee } from '../types/domain';

interface ClockInOutWidgetProps {
  employee: Employee;
}

export function ClockInOutWidget({ employee }: ClockInOutWidgetProps) {
  const { t } = useTranslation();
  const { data: openRecord, isLoading } = useOpenAttendance(employee.id);
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  const handleClockIn = async () => {
    if (!employee.primary_branch_id) return;
    const position = await getCurrentPositionSafe();
    clockIn.mutate({
      employeeId: employee.id,
      branchId: employee.primary_branch_id,
      geoLat: position?.lat,
      geoLng: position?.lng,
    });
  };

  const handleClockOut = () => {
    if (openRecord) clockOut.mutate(openRecord.id);
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle1">{t('attendance.title')}</Typography>
        {openRecord ? (
          <>
            <Typography>
              {t('attendance.currentlyClockedIn', {
                time: new Date(openRecord.clock_in).toLocaleTimeString(),
              })}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleClockOut}
              disabled={clockOut.isPending}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('attendance.clockOut')}
            </Button>
          </>
        ) : (
          <>
            <Typography color="text.secondary">{t('attendance.notClockedIn')}</Typography>
            <Button
              variant="contained"
              onClick={handleClockIn}
              disabled={clockIn.isPending || !employee.primary_branch_id}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('attendance.clockIn')}
            </Button>
          </>
        )}
      </Stack>
    </Paper>
  );
}
