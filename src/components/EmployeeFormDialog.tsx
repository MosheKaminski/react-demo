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
  Divider,
  Typography,
  Alert,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../lib/useAuth';
import { useInviteEmployee, useProfileRole, useUpdateProfileRole } from '../features/employees/hooks';
import { EmployeeBranchAssignments } from './EmployeeBranchAssignments';
import { EmployeeSalarySection } from './EmployeeSalarySection';
import { EmployeeDocumentsSection } from './EmployeeDocumentsSection';
import type { Branch, Employee, EmployeeInput, Role } from '../types/domain';

interface EmployeeFormDialogProps {
  open: boolean;
  employee: Employee | null;
  branches: Branch[];
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => void;
  submitting: boolean;
}

const ROLE_OPTIONS: Role[] = ['employee', 'branch_manager', 'admin'];

function EmployeeFormFields({
  employee,
  branches,
  onClose,
  onSubmit,
  submitting,
}: Omit<EmployeeFormDialogProps, 'open'>) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState(employee?.full_name ?? '');
  const [idNumber, setIdNumber] = useState(employee?.id_number ?? '');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [startDate, setStartDate] = useState(
    employee?.start_date ?? new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(employee?.end_date ?? '');
  const [primaryBranchId, setPrimaryBranchId] = useState(employee?.primary_branch_id ?? '');

  const { profile } = useAuth();
  const { data: profileRole } = useProfileRole(employee?.user_id);
  const updateProfileRole = useUpdateProfileRole();
  const inviteEmployee = useInviteEmployee();

  const handleSubmit = () => {
    onSubmit({
      full_name: fullName,
      id_number: idNumber || null,
      phone: phone || null,
      email: email || null,
      start_date: startDate,
      end_date: endDate || null,
      primary_branch_id: primaryBranchId,
    });
  };

  return (
    <>
      <DialogTitle>{employee ? t('employees.editEmployee') : t('employees.newEmployee')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('employees.fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label={t('employees.idNumber')}
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
          />
          <TextField
            label={t('common.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            label={t('common.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t('employees.startDate')}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            required
          />
          <TextField
            label={t('employees.endDate')}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label={t('employees.primaryBranch')}
            value={primaryBranchId}
            onChange={(e) => setPrimaryBranchId(e.target.value)}
            required
          >
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>

          {employee && (
            <>
              <Divider />
              <EmployeeBranchAssignments
                employeeId={employee.id}
                primaryBranchId={primaryBranchId}
                branches={branches}
              />
            </>
          )}

          {employee && <EmployeeSalarySection employeeId={employee.id} />}

          {employee && (
            <>
              <Divider />
              <EmployeeDocumentsSection employeeId={employee.id} />
            </>
          )}

          {employee?.user_id && (
            <>
              <Divider />
              <Typography variant="subtitle2">{t('employees.profileRole')}</Typography>
              <TextField
                select
                value={profileRole ?? ''}
                onChange={(e) =>
                  updateProfileRole.mutate({
                    userId: employee.user_id!,
                    role: e.target.value as Role,
                  })
                }
              >
                {ROLE_OPTIONS.map((role) => (
                  <MenuItem key={role} value={role}>
                    {t(`roles.${role}`)}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
          {employee && !employee.user_id && (
            <>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                {t('employees.noLinkedAccount')}
              </Typography>
              {profile?.role === 'admin' && (
                <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    disabled={!employee.email || inviteEmployee.isPending}
                    onClick={() => inviteEmployee.mutate(employee.id)}
                  >
                    {t('employees.inviteToSystem')}
                  </Button>
                  {!employee.email && (
                    <Typography variant="caption" color="text.secondary">
                      {t('employees.inviteRequiresEmail')}
                    </Typography>
                  )}
                  {inviteEmployee.isSuccess && (
                    <Alert severity="success">
                      {t('employees.inviteSent', { email: employee.email })}
                    </Alert>
                  )}
                  {inviteEmployee.isError && (
                    <Alert severity="error">{(inviteEmployee.error as Error).message}</Alert>
                  )}
                </Stack>
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!fullName || !primaryBranchId || submitting}
        >
          {t('common.save')}
        </Button>
      </DialogActions>
    </>
  );
}

export function EmployeeFormDialog({
  open,
  employee,
  branches,
  onClose,
  onSubmit,
  submitting,
}: EmployeeFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && (
        <EmployeeFormFields
          key={employee?.id ?? 'new'}
          employee={employee}
          branches={branches}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      )}
    </Dialog>
  );
}
