import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useBranches } from '../features/branches/hooks';
import { useEmployees } from '../features/employees/hooks';
import {
  useFinalizePayrollRun,
  usePayrollLines,
  usePayrollRuns,
  useReopenPayrollRun,
  useRunPayroll,
} from '../features/payroll/hooks';
import { OvertimePolicySettings } from '../components/OvertimePolicySettings';
import { generateAndUploadPayrollPdf } from '../lib/payrollPdf';
import { getPayrollPdfSignedUrl } from '../features/payroll/api';
import type { PayrollRunStatus } from '../types/domain';

const STATUS_COLOR: Record<PayrollRunStatus, 'default' | 'success'> = {
  draft: 'default',
  finalized: 'success',
};

export function PayrollPage() {
  const { t } = useTranslation();
  const { data: branches } = useBranches();
  const { data: employees } = useEmployees();
  const employeeNameById = useMemo(
    () => new Map((employees ?? []).map((e) => [e.id, e.full_name])),
    [employees],
  );

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [branchId, setBranchId] = useState('');

  const runPayroll = useRunPayroll();
  const { data: pastRuns } = usePayrollRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>(undefined);
  const { data: lines, isLoading: linesLoading } = usePayrollLines(selectedRunId);
  const finalizeRun = useFinalizePayrollRun();
  const reopenRun = useReopenPayrollRun();

  const justRunResult = runPayroll.data;
  const selectedRun =
    (pastRuns ?? []).find((r) => r.id === selectedRunId) ??
    (justRunResult && justRunResult.run.id === selectedRunId ? justRunResult.run : undefined);

  const [pdfBusyLineId, setPdfBusyLineId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleRunPayroll = () => {
    runPayroll
      .mutateAsync({ year, month, branchId: branchId || undefined })
      .then((result) => setSelectedRunId(result.run.id));
  };

  const handleGeneratePdf = async (lineId: string) => {
    const line = (lines ?? []).find((l) => l.id === lineId);
    if (!line || !selectedRun) return;
    const employee = (employees ?? []).find((e) => e.id === line.employee_id);
    if (!employee) return;
    setPdfBusyLineId(lineId);
    try {
      await generateAndUploadPayrollPdf(employee, selectedRun, line);
      await queryClient.invalidateQueries({ queryKey: ['payroll-lines', selectedRunId] });
    } finally {
      setPdfBusyLineId(null);
    }
  };

  const handleDownloadPdf = async (path: string) => {
    const url = await getPayrollPdfSignedUrl(path);
    window.open(url, '_blank');
  };

  const handleReopen = () => {
    if (!selectedRun) return;
    const note = window.prompt(t('payroll.reopenPrompt'));
    if (note === null) return;
    reopenRun.mutate({ id: selectedRun.id, auditNote: note });
  };

  return (
    <Stack spacing={4}>
      <Typography variant="h5">{t('payroll.title')}</Typography>

      <OvertimePolicySettings />

      <Stack spacing={2}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, max-content))',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <TextField
            label={t('payroll.year')}
            type="number"
            size="small"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            sx={{ width: 120 }}
          />
          <TextField
            select
            label={t('payroll.month')}
            size="small"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            sx={{ width: 120 }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('branches.title')}
            size="small"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">{t('payroll.allBranches')}</MenuItem>
            {(branches ?? []).map((b) => (
              <MenuItem key={b.id} value={b.id}>
                {b.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunPayroll}
            disabled={runPayroll.isPending}
          >
            {t('payroll.runPayroll')}
          </Button>
        </Box>

        {runPayroll.isError && (
          <Alert severity="error">{(runPayroll.error as Error).message}</Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          {t('payroll.disclaimer')}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={4}>
        <Stack spacing={1} sx={{ minWidth: 220 }}>
          <Typography variant="subtitle1">{t('payroll.pastRuns')}</Typography>
          {(pastRuns ?? []).length === 0 ? (
            <Stack spacing={1} sx={{ alignItems: 'center', py: 4, color: 'text.secondary' }}>
              <ReceiptLongIcon fontSize="large" />
              <Typography>{t('payroll.noPastRuns')}</Typography>
            </Stack>
          ) : (
            <List dense>
              {(pastRuns ?? []).map((run) => (
                <ListItemButton
                  key={run.id}
                  selected={run.id === selectedRunId}
                  onClick={() => setSelectedRunId(run.id)}
                >
                  <ListItemText
                    primary={`${run.period_month}/${run.period_year}${run.branch_id ? '' : ` (${t('payroll.allBranches')})`}`}
                    secondary={t(`payroll.runStatus.${run.status}`)}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Stack>

        {selectedRunId && (
          <Stack spacing={2} sx={{ flexGrow: 1 }}>
            {selectedRun && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Chip
                  label={t(`payroll.runStatus.${selectedRun.status}`)}
                  color={STATUS_COLOR[selectedRun.status]}
                />
                {selectedRun.status === 'draft' ? (
                  <Button
                    size="small"
                    startIcon={<LockIcon />}
                    onClick={() => finalizeRun.mutate(selectedRun.id)}
                  >
                    {t('payroll.finalize')}
                  </Button>
                ) : (
                  <Button size="small" startIcon={<LockOpenIcon />} onClick={handleReopen}>
                    {t('payroll.reopen')}
                  </Button>
                )}
              </Stack>
            )}

            {linesLoading ? (
              <CircularProgress />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('attendance.employee')}</TableCell>
                      <TableCell>{t('payroll.regularHours')}</TableCell>
                      <TableCell>{t('payroll.overtime125Hours')}</TableCell>
                      <TableCell>{t('payroll.overtime150Hours')}</TableCell>
                      <TableCell>{t('payroll.weekendHolidayHours')}</TableCell>
                      <TableCell>{t('payroll.grossBase')}</TableCell>
                      <TableCell>{t('payroll.grossOvertime')}</TableCell>
                      <TableCell>{t('payroll.adjustmentsTotal')}</TableCell>
                      <TableCell>{t('payroll.grossTotal')}</TableCell>
                      <TableCell>{t('common.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(lines ?? []).map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{employeeNameById.get(line.employee_id) ?? '—'}</TableCell>
                        <TableCell>{line.regular_hours}</TableCell>
                        <TableCell>{line.overtime_125_hours}</TableCell>
                        <TableCell>{line.overtime_150_hours}</TableCell>
                        <TableCell>{line.weekend_holiday_hours}</TableCell>
                        <TableCell>{line.gross_base.toFixed(2)}</TableCell>
                        <TableCell>{line.gross_overtime.toFixed(2)}</TableCell>
                        <TableCell>{line.adjustments_total.toFixed(2)}</TableCell>
                        <TableCell>{line.gross_total.toFixed(2)}</TableCell>
                        <TableCell>
                          {line.pdf_path ? (
                            <Button
                              size="small"
                              startIcon={<DownloadIcon />}
                              onClick={() => handleDownloadPdf(line.pdf_path!)}
                            >
                              {t('payroll.downloadPdf')}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              startIcon={<PictureAsPdfIcon />}
                              onClick={() => handleGeneratePdf(line.id)}
                              disabled={pdfBusyLineId === line.id}
                            >
                              {t('payroll.generatePdf')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
