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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StoreIcon from '@mui/icons-material/Store';
import {
  useBranches,
  useCreateBranch,
  useSetBranchActive,
  useUpdateBranch,
} from '../features/branches/hooks';
import { useEmployees } from '../features/employees/hooks';
import { BranchFormDialog } from '../components/BranchFormDialog';
import type { Branch, BranchInput } from '../types/domain';

export function BranchesPage() {
  const { t } = useTranslation();
  const { data: branches, isLoading } = useBranches();
  const { data: employees } = useEmployees({ isActive: true });
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const setBranchActive = useSetBranchActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const employeesById = useMemo(() => {
    const map = new Map<string, string>();
    (employees ?? []).forEach((e) => map.set(e.id, e.full_name));
    return map;
  }, [employees]);

  const openCreate = () => {
    setEditingBranch(null);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setDialogOpen(true);
  };

  const handleSubmit = (input: BranchInput) => {
    const mutation = editingBranch
      ? updateBranch.mutateAsync({ id: editingBranch.id, input })
      : createBranch.mutateAsync(input);
    mutation.then(() => setDialogOpen(false));
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">{t('branches.title')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          {t('branches.newBranch')}
        </Button>
      </Stack>
      {(branches ?? []).length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 6, color: 'text.secondary' }}>
          <StoreIcon fontSize="large" />
          <Typography>{t('dashboard.noBranches')}</Typography>
        </Stack>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('common.name')}</TableCell>
                <TableCell>{t('common.address')}</TableCell>
                <TableCell>{t('common.phone')}</TableCell>
                <TableCell>{t('branches.manager')}</TableCell>
                <TableCell>{t('common.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(branches ?? []).map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.address}</TableCell>
                  <TableCell>{branch.phone}</TableCell>
                  <TableCell>
                    {branch.manager_id
                      ? (employeesById.get(branch.manager_id) ?? '—')
                      : t('branches.noManager')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={branch.is_active ? t('common.active') : t('common.inactive')}
                      color={branch.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => openEdit(branch)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="small"
                        color={branch.is_active ? 'error' : 'success'}
                        startIcon={branch.is_active ? <BlockIcon /> : <CheckCircleIcon />}
                        onClick={() =>
                          setBranchActive.mutate({ id: branch.id, isActive: !branch.is_active })
                        }
                      >
                        {branch.is_active ? t('common.deactivate') : t('common.reactivate')}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <BranchFormDialog
        open={dialogOpen}
        branch={editingBranch}
        employees={employees ?? []}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        submitting={createBranch.isPending || updateBranch.isPending}
      />
    </Stack>
  );
}
