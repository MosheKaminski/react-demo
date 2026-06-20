import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../lib/useAuth';
import { useEmployeeByUserId, useEmployees } from '../features/employees/hooks';
import {
  useAttendanceHistory,
  usePendingApprovals,
  useSetAttendanceStatus,
} from '../features/attendance/hooks';
import { ClockInOutWidget } from '../components/ClockInOutWidget';
import { ManualAttendanceDialog } from '../components/ManualAttendanceDialog';
import type { AttendanceStatus } from '../types/domain';

const STATUS_COLOR: Record<AttendanceStatus, 'warning' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export function AttendancePage() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const { data: myEmployee } = useEmployeeByUserId(session?.user.id);
  const { data: history } = useAttendanceHistory(myEmployee?.id);

  const canManage = profile?.role === 'admin' || profile?.role === 'branch_manager';
  const { data: pending, isLoading: pendingLoading } = usePendingApprovals();
  const { data: scopedEmployees } = useEmployees({ isActive: true });
  const setStatus = useSetAttendanceStatus();
  const [manualDialogOpen, setManualDialogOpen] = useState(false);

  const employeeNameById = new Map((scopedEmployees ?? []).map((e) => [e.id, e.full_name]));

  return (
    <Stack spacing={4}>
      <Typography variant="h5">{t('attendance.title')}</Typography>

      {myEmployee ? (
        <ClockInOutWidget employee={myEmployee} />
      ) : (
        <Typography color="text.secondary">{t('attendance.noEmployeeRecord')}</Typography>
      )}

      {myEmployee && (
        <Stack spacing={1}>
          <Typography variant="subtitle1">{t('attendance.myHistory')}</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('attendance.clockInTime')}</TableCell>
                <TableCell>{t('attendance.clockOutTime')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(history ?? []).map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{new Date(record.clock_in).toLocaleString()}</TableCell>
                  <TableCell>
                    {record.clock_out ? new Date(record.clock_out).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t(`attendance.status.${record.status}`)}
                      color={STATUS_COLOR[record.status]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}

      {canManage && (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">{t('attendance.pendingApprovals')}</Typography>
            <Button variant="contained" onClick={() => setManualDialogOpen(true)}>
              {t('attendance.newManualEntry')}
            </Button>
          </Stack>
          {pendingLoading ? (
            <CircularProgress />
          ) : (pending ?? []).length === 0 ? (
            <Typography color="text.secondary">{t('attendance.noPendingApprovals')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('attendance.employee')}</TableCell>
                  <TableCell>{t('attendance.clockInTime')}</TableCell>
                  <TableCell>{t('attendance.clockOutTime')}</TableCell>
                  <TableCell>{t('attendance.notes')}</TableCell>
                  <TableCell>{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(pending ?? []).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{employeeNameById.get(record.employee_id) ?? '—'}</TableCell>
                    <TableCell>{new Date(record.clock_in).toLocaleString()}</TableCell>
                    <TableCell>
                      {record.clock_out ? new Date(record.clock_out).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>{record.notes}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          color="success"
                          onClick={() =>
                            setStatus.mutate({
                              id: record.id,
                              status: 'approved',
                              approvedBy: session!.user.id,
                            })
                          }
                        >
                          {t('attendance.approve')}
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() =>
                            setStatus.mutate({
                              id: record.id,
                              status: 'rejected',
                              approvedBy: session!.user.id,
                            })
                          }
                        >
                          {t('attendance.reject')}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      )}

      <ManualAttendanceDialog
        open={manualDialogOpen}
        employees={scopedEmployees ?? []}
        onClose={() => setManualDialogOpen(false)}
      />
    </Stack>
  );
}
