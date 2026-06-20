import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Employee, PayrollLine, PayrollRun } from '../types/domain';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11 },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 12, marginBottom: 16, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#555' },
  total: { fontSize: 13, marginTop: 12 },
  disclaimer: { marginTop: 24, fontSize: 9, color: '#888' },
});

export interface PayrollPdfDocumentProps {
  employee: Employee;
  run: PayrollRun;
  line: PayrollLine;
}

export function PayrollPdfDocument({ employee, run, line }: PayrollPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Internal Salary Summary</Text>
        <Text style={styles.subtitle}>
          {employee.full_name} — {run.period_month}/{run.period_year}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Regular hours</Text>
          <Text>{line.regular_hours}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overtime hours (125%)</Text>
          <Text>{line.overtime_125_hours}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overtime hours (150%)</Text>
          <Text>{line.overtime_150_hours}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Weekend/holiday hours</Text>
          <Text>{line.weekend_holiday_hours}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Gross base pay</Text>
          <Text>{line.gross_base.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Gross overtime pay</Text>
          <Text>{line.gross_overtime.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Adjustments (bonuses/deductions)</Text>
          <Text>{line.adjustments_total.toFixed(2)}</Text>
        </View>

        <View style={[styles.row, styles.total]}>
          <Text>Gross total</Text>
          <Text>{line.gross_total.toFixed(2)}</Text>
        </View>

        <Text style={styles.disclaimer}>
          This is an internal salary summary generated for reference purposes only. It is not an
          official payslip and is not a substitute for legally required payroll documentation.
        </Text>
      </Page>
    </Document>
  );
}
