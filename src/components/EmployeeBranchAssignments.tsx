import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, Typography, Chip, TextField, MenuItem, Button } from '@mui/material';
import {
  useAddBranchAssignment,
  useBranchAssignments,
  useRemoveBranchAssignment,
} from '../features/employees/hooks';
import type { Branch } from '../types/domain';

interface EmployeeBranchAssignmentsProps {
  employeeId: string;
  primaryBranchId: string;
  branches: Branch[];
}

export function EmployeeBranchAssignments({
  employeeId,
  primaryBranchId,
  branches,
}: EmployeeBranchAssignmentsProps) {
  const { t } = useTranslation();
  const { data: assignments } = useBranchAssignments(employeeId);
  const addAssignment = useAddBranchAssignment(employeeId);
  const removeAssignment = useRemoveBranchAssignment(employeeId);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const assignedBranchIds = new Set((assignments ?? []).map((a) => a.branch_id));
  const branchesById = new Map(branches.map((b) => [b.id, b.name]));
  const availableBranches = branches.filter(
    (b) => b.id !== primaryBranchId && !assignedBranchIds.has(b.id),
  );

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t('employees.additionalBranches')}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {(assignments ?? []).map((assignment) => (
          <Chip
            key={assignment.id}
            label={branchesById.get(assignment.branch_id) ?? assignment.branch_id}
            onDelete={() => removeAssignment.mutate(assignment.id)}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        <TextField
          select
          size="small"
          label={t('branches.title')}
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {availableBranches.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          disabled={!selectedBranchId}
          onClick={() => {
            addAssignment.mutate(selectedBranchId);
            setSelectedBranchId('');
          }}
        >
          {t('employees.addBranch')}
        </Button>
      </Stack>
    </Stack>
  );
}
