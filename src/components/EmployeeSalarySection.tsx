import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useAuth } from '../lib/useAuth';
import {
  useCreateSalaryAdjustment,
  useSalaryAdjustments,
  useSalaryProfile,
  useSaveSalaryProfile,
} from '../features/payroll/hooks';
import type { AdjustmentType, PayType, SalaryProfile } from '../types/domain';

interface SalaryRateFormProps {
  employeeId: string;
  profile: SalaryProfile | null;
  canEdit: boolean;
}

function SalaryRateForm({ employeeId, profile, canEdit }: SalaryRateFormProps) {
  const { t } = useTranslation();
  const saveSalaryProfile = useSaveSalaryProfile(employeeId);

  const [payType, setPayType] = useState<PayType>(profile?.pay_type ?? 'hourly');
  const [baseRate, setBaseRate] = useState(profile ? String(profile.base_rate) : '');
  const [weeklyHoursBaseline, setWeeklyHoursBaseline] = useState(
    profile?.weekly_hours_baseline ? String(profile.weekly_hours_baseline) : '',
  );
  const [overtimeEligible, setOvertimeEligible] = useState(profile?.overtime_eligible ?? true);

  const handleSaveProfile = () => {
    saveSalaryProfile.mutate({
      pay_type: payType,
      base_rate: Number(baseRate),
      weekly_hours_baseline: weeklyHoursBaseline ? Number(weeklyHoursBaseline) : null,
      overtime_eligible: overtimeEligible,
    });
  };

  return (
    <>
      <TextField
        select
        label={t('payroll.payType')}
        value={payType}
        onChange={(e) => setPayType(e.target.value as PayType)}
        disabled={!canEdit}
      >
        <MenuItem value="hourly">{t('payroll.hourly')}</MenuItem>
        <MenuItem value="monthly">{t('payroll.monthly')}</MenuItem>
      </TextField>
      <TextField
        label={t('payroll.baseRate')}
        type="number"
        value={baseRate}
        onChange={(e) => setBaseRate(e.target.value)}
        disabled={!canEdit}
      />
      <TextField
        label={t('payroll.weeklyHoursBaseline')}
        type="number"
        value={weeklyHoursBaseline}
        onChange={(e) => setWeeklyHoursBaseline(e.target.value)}
        disabled={!canEdit}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={overtimeEligible}
            onChange={(e) => setOvertimeEligible(e.target.checked)}
            disabled={!canEdit}
          />
        }
        label={t('payroll.overtimeEligible')}
      />
      {canEdit && (
        <Button
          variant="outlined"
          onClick={handleSaveProfile}
          disabled={!baseRate || saveSalaryProfile.isPending}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('payroll.saveSalaryProfile')}
        </Button>
      )}
    </>
  );
}

interface EmployeeSalarySectionProps {
  employeeId: string;
}

export function EmployeeSalarySection({ employeeId }: EmployeeSalarySectionProps) {
  const { t } = useTranslation();
  const { session, profile } = useAuth();
  const canEditRate = profile?.role === 'admin';
  const canAddAdjustment = profile?.role === 'admin' || profile?.role === 'branch_manager';

  const { data: salaryProfile } = useSalaryProfile(employeeId);
  const { data: adjustments } = useSalaryAdjustments(employeeId);
  const createAdjustment = useCreateSalaryAdjustment(employeeId);

  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('bonus');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentMonth, setAdjustmentMonth] = useState(new Date().toISOString().slice(0, 7));

  const handleAddAdjustment = () => {
    if (!session) return;
    createAdjustment
      .mutateAsync({
        input: {
          employee_id: employeeId,
          type: adjustmentType,
          amount: Number(adjustmentAmount),
          description: adjustmentDescription || null,
          effective_month: `${adjustmentMonth}-01`,
        },
        createdBy: session.user.id,
      })
      .then(() => {
        setAdjustmentAmount('');
        setAdjustmentDescription('');
      });
  };

  return (
    <Stack spacing={2}>
      <Divider />
      <Typography variant="subtitle2">{t('payroll.salaryProfile')}</Typography>
      {salaryProfile !== undefined && (
        <SalaryRateForm
          key={salaryProfile?.id ?? 'none'}
          employeeId={employeeId}
          profile={salaryProfile}
          canEdit={canEditRate}
        />
      )}

      <Divider />
      <Typography variant="subtitle2">{t('payroll.adjustments')}</Typography>
      <List dense>
        {(adjustments ?? []).map((adjustment) => (
          <ListItem key={adjustment.id} disableGutters>
            <ListItemText
              primary={`${t(`payroll.adjustmentType.${adjustment.type}`)}: ${adjustment.amount} (${adjustment.effective_month.slice(0, 7)})`}
              secondary={adjustment.description}
            />
          </ListItem>
        ))}
      </List>
      {canAddAdjustment && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <TextField
            select
            size="small"
            label={t('payroll.type')}
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="bonus">{t('payroll.adjustmentType.bonus')}</MenuItem>
            <MenuItem value="deduction">{t('payroll.adjustmentType.deduction')}</MenuItem>
            <MenuItem value="addition">{t('payroll.adjustmentType.addition')}</MenuItem>
          </TextField>
          <TextField
            size="small"
            label={t('payroll.amount')}
            type="number"
            value={adjustmentAmount}
            onChange={(e) => setAdjustmentAmount(e.target.value)}
            sx={{ minWidth: 100 }}
          />
          <TextField
            size="small"
            type="month"
            label={t('payroll.effectiveMonth')}
            value={adjustmentMonth}
            onChange={(e) => setAdjustmentMonth(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            label={t('payroll.description')}
            value={adjustmentDescription}
            onChange={(e) => setAdjustmentDescription(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <Button
            onClick={handleAddAdjustment}
            disabled={!adjustmentAmount || createAdjustment.isPending}
          >
            {t('common.create')}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
