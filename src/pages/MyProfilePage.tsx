import { useTranslation } from 'react-i18next';
import {
  Stack,
  Typography,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
} from '@mui/material';
import { useAuth } from '../lib/useAuth';
import { useBranches } from '../features/branches/hooks';
import { useEmployeeByUserId } from '../features/employees/hooks';
import { usePayrollLinesForEmployee } from '../features/payroll/hooks';
import { getPayrollPdfSignedUrl } from '../features/payroll/api';
import { EmployeeDocumentsSection } from '../components/EmployeeDocumentsSection';

export function MyProfilePage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: employee, isLoading } = useEmployeeByUserId(session?.user.id);
  const { data: branches } = useBranches();
  const { data: payrollLines } = usePayrollLinesForEmployee(employee?.id);

  if (isLoading) return <CircularProgress />;

  if (!employee) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">{t('myProfile.title')}</Typography>
        <Typography>{t('myProfile.noEmployeeRecord')}</Typography>
      </Stack>
    );
  }

  const branchName = branches?.find((b) => b.id === employee.primary_branch_id)?.name ?? '—';
  const finalizedLines = (payrollLines ?? []).filter(
    (line) => line.payroll_runs.status === 'finalized',
  );

  const handleDownload = async (path: string) => {
    const url = await getPayrollPdfSignedUrl(path);
    window.open(url, '_blank');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t('myProfile.title')}</Typography>
      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          <Typography>
            {t('employees.fullName')}: {employee.full_name}
          </Typography>
          <Typography>
            {t('common.phone')}: {employee.phone ?? '—'}
          </Typography>
          <Typography>
            {t('common.email')}: {employee.email ?? '—'}
          </Typography>
          <Typography>
            {t('employees.primaryBranch')}: {branchName}
          </Typography>
          <Typography>
            {t('employees.startDate')}: {employee.start_date}
          </Typography>
        </Stack>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {t('myProfile.paySummary')}
        </Typography>
        {finalizedLines.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('myProfile.noPaySummaries')}
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('payroll.month')}/{t('payroll.year')}</TableCell>
                <TableCell>{t('payroll.grossTotal')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {finalizedLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.payroll_runs.period_month}/{line.payroll_runs.period_year}
                  </TableCell>
                  <TableCell>{line.gross_total.toFixed(2)}</TableCell>
                  <TableCell>
                    {line.pdf_path && (
                      <Button size="small" onClick={() => handleDownload(line.pdf_path!)}>
                        {t('payroll.downloadPdf')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          {t('payroll.disclaimer')}
        </Typography>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <EmployeeDocumentsSection employeeId={employee.id} />
      </Paper>
    </Stack>
  );
}
