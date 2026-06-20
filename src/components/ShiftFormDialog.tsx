import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
  Alert,
} from '@mui/material';
import { useOverlapCheck } from '../features/shifts/hooks';
import type { Branch, Employee, Shift, ShiftInput, ShiftStatus } from '../types/domain';

interface ShiftFormDialogProps {
  open: boolean;
  shift: Shift | null;
  branches: Branch[];
  employees: Employee[];
  defaultBranchId?: string;
  onClose: () => void;
  onSubmit: (input: ShiftInput) => void;
  submitting: boolean;
}

function toLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function ShiftFormFields({
  shift,
  branches,
  employees,
  defaultBranchId,
  onClose,
  onSubmit,
  submitting,
}: Omit<ShiftFormDialogProps, 'open'>) {
  const { t } = useTranslation();
  const [branchId, setBranchId] = useState(shift?.branch_id ?? defaultBranchId ?? '');
  const [employeeId, setEmployeeId] = useState(shift?.employee_id ?? '');
  const [startTime, setStartTime] = useState(
    shift ? toLocalDateTimeInput(shift.start_time) : '',
  );
  const [endTime, setEndTime] = useState(shift ? toLocalDateTimeInput(shift.end_time) : '');
  const [roleInShift, setRoleInShift] = useState(shift?.role_in_shift ?? '');
  const [status, setStatus] = useState<ShiftStatus>(shift?.status ?? 'draft');

  const overlapCheck = useOverlapCheck();

  useEffect(() => {
    if (employeeId && startTime && endTime) {
      overlapCheck.mutate({
        employeeId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        excludeShiftId: shift?.id,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, startTime, endTime]);

  const employeesInBranch = employees.filter((e) => e.primary_branch_id === branchId);

  const handleSubmit = () => {
    onSubmit({
      branch_id: branchId,
      employee_id: employeeId || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      role_in_shift: roleInShift || null,
      status,
    });
  };

  const hasConflict = (overlapCheck.data ?? []).length > 0;

  return (
    <>
      <DialogTitle>{shift ? t('shifts.editShift') : t('shifts.newShift')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('shifts.branch')}
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              setEmployeeId('');
            }}
            required
          >
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('shifts.employee')}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <MenuItem value="">{t('shifts.unassigned')}</MenuItem>
            {employeesInBranch.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.full_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('shifts.roleInShift')}
            value={roleInShift}
            onChange={(e) => setRoleInShift(e.target.value)}
          />
          <TextField
            label={t('shifts.startTime')}
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            label={t('shifts.endTime')}
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          {hasConflict && <Alert severity="warning">{t('shifts.conflictWarning')}</Alert>}
          <TextField
            select
            label={t('common.status')}
            value={status}
            onChange={(e) => setStatus(e.target.value as ShiftStatus)}
          >
            {(['draft', 'published', 'completed', 'cancelled'] as ShiftStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {t(`shifts.status.${s}`)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!branchId || !startTime || !endTime || submitting}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </>
  );
}

export function ShiftFormDialog({
  open,
  shift,
  branches,
  employees,
  defaultBranchId,
  onClose,
  onSubmit,
  submitting,
}: ShiftFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && (
        <ShiftFormFields
          key={shift?.id ?? 'new'}
          shift={shift}
          branches={branches}
          employees={employees}
          defaultBranchId={defaultBranchId}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      )}
    </Dialog>
  );
}
