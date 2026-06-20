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
import type { Branch, BranchInput, Employee } from '../types/domain';

interface BranchFormDialogProps {
  open: boolean;
  branch: Branch | null;
  employees: Employee[];
  onClose: () => void;
  onSubmit: (input: BranchInput) => void;
  submitting: boolean;
}

function BranchFormFields({
  branch,
  employees,
  onClose,
  onSubmit,
  submitting,
}: Omit<BranchFormDialogProps, 'open'>) {
  const { t } = useTranslation();
  const [name, setName] = useState(branch?.name ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [managerId, setManagerId] = useState(branch?.manager_id ?? '');

  const handleSubmit = () => {
    onSubmit({
      name,
      address: address || null,
      phone: phone || null,
      manager_id: managerId || null,
    });
  };

  return (
    <>
      <DialogTitle>{branch ? t('branches.editBranch') : t('branches.newBranch')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label={t('common.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label={t('common.address')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <TextField
            label={t('common.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            select
            label={t('branches.manager')}
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
          >
            <MenuItem value="">{t('branches.noManager')}</MenuItem>
            {employees.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.full_name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name || submitting}>
          {t('common.save')}
        </Button>
      </DialogActions>
    </>
  );
}

export function BranchFormDialog({
  open,
  branch,
  employees,
  onClose,
  onSubmit,
  submitting,
}: BranchFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open && (
        <BranchFormFields
          key={branch?.id ?? 'new'}
          branch={branch}
          employees={employees}
          onClose={onClose}
          onSubmit={onSubmit}
          submitting={submitting}
        />
      )}
    </Dialog>
  );
}
