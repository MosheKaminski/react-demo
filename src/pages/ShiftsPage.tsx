import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import DeleteIcon from '@mui/icons-material/Delete';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { useAuth } from '../lib/useAuth';
import { useBranches } from '../features/branches/hooks';
import { useEmployeeByUserId, useEmployees } from '../features/employees/hooks';
import {
  useCreateShift,
  useDeleteShift,
  useShifts,
  useUpdateShift,
} from '../features/shifts/hooks';
import { ShiftFormDialog } from '../components/ShiftFormDialog';
import type { Shift, ShiftInput, ShiftStatus } from '../types/domain';

function startOfWeek(offset: number): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  start.setDate(start.getDate() + offset * 7);
  start.setHours(0, 0, 0, 0);
  return start;
}

const STATUS_COLOR: Record<ShiftStatus, 'default' | 'success' | 'info' | 'error'> = {
  draft: 'default',
  published: 'success',
  completed: 'info',
  cancelled: 'error',
};

export function ShiftsPage() {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const canManage = profile?.role === 'admin' || profile?.role === 'branch_manager';

  const { data: branches } = useBranches();
  const { data: employees } = useEmployees({ isActive: true });
  const { data: myEmployee } = useEmployeeByUserId(session?.user.id);

  const [branchId, setBranchId] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    return end;
  }, [weekStart]);

  const effectiveBranchId = branchId || branches?.[0]?.id;

  const { data: branchShifts, isLoading } = useShifts({
    branchId: effectiveBranchId,
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
  });

  const { data: myShifts } = useShifts({ employeeId: myEmployee?.id });
  const upcomingMyShifts = (myShifts ?? []).filter(
    (s) => new Date(s.start_time) >= new Date() && s.status !== 'cancelled',
  );

  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const employeeNameById = new Map((employees ?? []).map((e) => [e.id, e.full_name]));

  const openCreate = () => {
    setEditingShift(null);
    setDialogOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingShift(shift);
    setDialogOpen(true);
  };

  const handleSubmit = (input: ShiftInput) => {
    const mutation = editingShift
      ? updateShift.mutateAsync({ id: editingShift.id, input })
      : createShift.mutateAsync(input);
    mutation.then(() => setDialogOpen(false));
  };

  return (
    <Stack spacing={4}>
      <Typography variant="h5">{t('shifts.title')}</Typography>

      {canManage && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label={t('shifts.filterByBranch')}
              value={effectiveBranchId ?? ''}
              onChange={(e) => setBranchId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {(branches ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </TextField>
            <IconButton
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label={t('shifts.previousWeek')}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography>
              {weekStart.toLocaleDateString()} –{' '}
              {new Date(weekEnd.getTime() - 1).toLocaleDateString()}
            </Typography>
            <IconButton
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label={t('shifts.nextWeek')}
            >
              <ChevronRightIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              disabled={!effectiveBranchId}
            >
              {t('shifts.newShift')}
            </Button>
          </Stack>

          {isLoading ? (
            <CircularProgress />
          ) : (branchShifts ?? []).length === 0 ? (
            <Stack spacing={1} sx={{ alignItems: 'center', py: 4, color: 'text.secondary' }}>
              <EventBusyIcon fontSize="large" />
              <Typography>{t('shifts.noUpcomingShifts')}</Typography>
            </Stack>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('shifts.employee')}</TableCell>
                    <TableCell>{t('shifts.startTime')}</TableCell>
                    <TableCell>{t('shifts.endTime')}</TableCell>
                    <TableCell>{t('common.status')}</TableCell>
                    <TableCell>{t('common.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(branchShifts ?? []).map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        {shift.employee_id
                          ? (employeeNameById.get(shift.employee_id) ?? '—')
                          : t('shifts.unassigned')}
                      </TableCell>
                      <TableCell>{new Date(shift.start_time).toLocaleString()}</TableCell>
                      <TableCell>{new Date(shift.end_time).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t(`shifts.status.${shift.status}`)}
                          color={STATUS_COLOR[shift.status]}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => openEdit(shift)}
                          >
                            {t('common.edit')}
                          </Button>
                          {shift.status === 'draft' && (
                            <Button
                              size="small"
                              color="success"
                              startIcon={<PublishIcon />}
                              onClick={() =>
                                updateShift.mutate({ id: shift.id, input: { status: 'published' } })
                              }
                            >
                              {t('shifts.publish')}
                            </Button>
                          )}
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => deleteShift.mutate(shift.id)}
                          >
                            {t('shifts.delete')}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      {myEmployee && (
        <Stack spacing={1}>
          <Typography variant="subtitle1">{t('shifts.mySchedule')}</Typography>
          {upcomingMyShifts.length === 0 ? (
            <Typography color="text.secondary">{t('shifts.noUpcomingShifts')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('shifts.startTime')}</TableCell>
                    <TableCell>{t('shifts.endTime')}</TableCell>
                    <TableCell>{t('common.status')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingMyShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>{new Date(shift.start_time).toLocaleString()}</TableCell>
                      <TableCell>{new Date(shift.end_time).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={t(`shifts.status.${shift.status}`)}
                          color={STATUS_COLOR[shift.status]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      <ShiftFormDialog
        open={dialogOpen}
        shift={editingShift}
        branches={branches ?? []}
        employees={employees ?? []}
        defaultBranchId={effectiveBranchId}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        submitting={createShift.isPending || updateShift.isPending}
      />
    </Stack>
  );
}
