import { pdf } from '@react-pdf/renderer';
import { PayrollPdfDocument } from '../components/PayrollPdfDocument';
import type { Employee, PayrollLine, PayrollRun } from '../types/domain';
import { payrollPdfPath, setPayrollLinePdfPath, uploadPayrollPdf } from '../features/payroll/api';

export async function generateAndUploadPayrollPdf(
  employee: Employee,
  run: PayrollRun,
  line: PayrollLine,
): Promise<string> {
  const blob = await pdf(
    <PayrollPdfDocument employee={employee} run={run} line={line} />,
  ).toBlob();
  const path = payrollPdfPath(employee.id, run.id);
  await uploadPayrollPdf(path, blob);
  await setPayrollLinePdfPath(line.id, path);
  return path;
}
