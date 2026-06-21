import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TableContainer,
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { useAuth } from '../lib/useAuth';
import { useBranches } from '../features/branches/hooks';
import {
  useAllProfiles,
  useCreateEmployee,
  useEmployees,
  useSetEmployeeActive,
  useUpdateEmployee,
} from '../features/employees/hooks';
import { EmployeeFormDialog } from '../components/EmployeeFormDialog';
import type { Employee, EmployeeInput, Role } from '../types/domain';

export function EmployeesPage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { data: branches } = useBranches();
  const { data: allProfiles } = useAllProfiles();
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

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

  const roleByUserId = useMemo(() => {
    const map = new Map<string, Role>();
    (allProfiles ?? []).forEach((p) => map.set(p.id, p.role));
    return map;
  }, [allProfiles]);

  const visibleEmployees = useMemo(() => {
    if (!isAdmin || roleFilter === 'all') return employees ?? [];
    return (employees ?? []).filter((e) => e.user_id && roleByUserId.get(e.user_id) === roleFilter);
  }, [employees, isAdmin, roleFilter, roleByUserId]);

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
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
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
        {isAdmin && (
          <TextField
            select
            size="small"
            label={t('employees.filterByRole')}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | Role)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">{t('common.all')}</MenuItem>
            <MenuItem value="admin">{t('roles.admin')}</MenuItem>
            <MenuItem value="branch_manager">{t('roles.branch_manager')}</MenuItem>
            <MenuItem value="employee">{t('roles.employee')}</MenuItem>
          </TextField>
        )}
      </Stack>

      {isLoading ? (
        <CircularProgress />
      ) : visibleEmployees.length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 6, color: 'text.secondary' }}>
          <PeopleIcon fontSize="large" />
          <Typography>{t('common.none')}</Typography>
        </Stack>
      ) : (
        <TableContainer>
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
              {visibleEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.full_name}</TableCell>
                  <TableCell>
                    {employee.primary_branch_id
                      ? (branchesById.get(employee.primary_branch_id) ?? '—')
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
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openEdit(employee)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="small"
                        color={employee.is_active ? 'error' : 'success'}
                        startIcon={employee.is_active ? <BlockIcon /> : <CheckCircleIcon />}
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
        </TableContainer>
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
