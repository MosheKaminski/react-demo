import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  Typography,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
} from '@mui/material';
import { useBranches } from '../features/branches/hooks';
import { useCreateEmployee, useEmployees, useSetEmployeeActive, useUpdateEmployee } from '../features/employees/hooks';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import type { Employee, EmployeeInput } from '../types/domain';

export function EmployeesPage() {
  const { t } = useTranslation();
  const { data: branches } = useBranches();
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const { data: employees, isLoading } = useEmployees({
    branchId: branchFilter || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const setEmployeeActive = useSetEmployeeActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const branchesById = useMemo(() => {
    const map = new Map<string, string>();
    (branches ?? []).forEach((b) => map.set(b.id, b.name));
    return map;
  }, [branches]);

  const openCreate = () => {
    setEditingEmployee(null);
    setDialogOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const handleSubmit = (input: EmployeeInput) => {
    const mutation = editingEmployee
      ? updateEmployee.mutateAsync({ id: editingEmployee.id, input })
      : createEmployee.mutateAsync(input);
    mutation.then(() => setDialogOpen(false));
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">{t('employees.title')}</Typography>
        <Button variant="contained" onClick={openCreate}>
          {t('employees.newEmployee')}
        </Button>
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          select
          size="small"
          label={t('employees.filterByBranch')}
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          {(branches ?? []).map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t('employees.filterByStatus')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="active">{t('common.active')}</MenuItem>
          <MenuItem value="inactive">{t('common.inactive')}</MenuItem>
          <MenuItem value="all">{t('common.all')}</MenuItem>
        </TextField>
      </Stack>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('employees.fullName')}</TableCell>
              <TableCell>{t('employees.primaryBranch')}</TableCell>
              <TableCell>{t('common.phone')}</TableCell>
              <TableCell>{t('common.email')}</TableCell>
              <TableCell>{t('common.status')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(employees ?? []).map((employee) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.full_name}</TableCell>
                <TableCell>
                  {employee.primary_branch_id
                    ? branchesById.get(employee.primary_branch_id) ?? '—'
                    : '—'}
                </TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>
                  <Chip
                    label={employee.is_active ? t('common.active') : t('common.inactive')}
                    color={employee.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => openEdit(employee)}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="small"
                      color={employee.is_active ? 'error' : 'success'}
                      onClick={() =>
                        setEmployeeActive.mutate({
                          id: employee.id,
                          isActive: !employee.is_active,
                        })
                      }
                    >
                      {employee.is_active ? t('common.deactivate') : t('common.reactivate')}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EmployeeFormDialog
        open={dialogOpen}
        employee={editingEmployee}
        branches={branches ?? []}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        submitting={createEmployee.isPending || updateEmployee.isPending}
      />
    </Stack>
  );
}
