import { useState } from 'react';
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
} from '@mui/material';
import { useCreateManualAttendance } from '../features/attendance/hooks';
import type { Employee } from '../types/domain';

interface ManualAttendanceDialogProps {
  open: boolean;
  employees: Employee[];
  onClose: () => void;
}

function toLocalDateTimeInput(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function ManualAttendanceForm({ employees, onClose }: Omit<ManualAttendanceDialogProps, 'open'>) {
  const { t } = useTranslation();
  const [employeeId, setEmployeeId] = useState('');
  const [clockIn, setClockIn] = useState(toLocalDateTimeInput(new Date()));
  const [clockOut, setClockOut] = useState('');
  const [notes, setNotes] = useState('');
  const createManual = useCreateManualAttendance();

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const handleSubmit = () => {
    if (!selectedEmployee?.primary_branch_id) return;
    createManual
      .mutateAsync({
        employee_id: employeeId,
        branch_id: selectedEmployee.primary_branch_id,
        clock_in: new Date(clockIn).toISOString(),
        clock_out: clockOut ? new Date(clockOut).toISOString() : null,
        notes,
      })
      .then(() => onClose());
  };

  return (
    <>
      <DialogTitle>{t('attendance.manualEntryTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label={t('attendance.employee')}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
          >
            {employees.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.full_name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('attendance.clockInTime')}
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            label={t('attendance.clockOutTime')}
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label={t('attendance.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            required
            multiline
            minRows={2}
            helperText={t('attendance.notesRequired')}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!employeeId || !clockIn || !notes || createManual.isPending}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </>
  );
}

export function ManualAttendanceDialog({ open, employees, onClose }: ManualAttendanceDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && <ManualAttendanceForm employees={employees} onClose={onClose} />}
    </Dialog>
  );
}
