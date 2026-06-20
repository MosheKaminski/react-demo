// Manually verifies branch-scoped RLS using the seeded test accounts,
// covering both read scoping and write (insert) permissions for the
// branch/employee CRUD added in Milestone 2.
// Run with: npm run verify-rls (after npm run seed).
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  BRANCH_A_NAME,
  BRANCH_B_NAME,
  BRANCH_MANAGER_EMAIL,
  BRANCH_MANAGER_PASSWORD,
  EMPLOYEE_EMAIL,
  EMPLOYEE_PASSWORD,
} from './fixtures';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  );
}

let failures = 0;

function check(label: string, condition: boolean) {
  console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
  if (!condition) failures += 1;
}

async function signInAs(email: string, password: string) {
  const client = createClient(supabaseUrl!, anonKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function main() {
  const admin = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: branchA } = await admin
    .from('branches')
    .select('id')
    .eq('name', BRANCH_A_NAME)
    .single();
  const { data: branchB } = await admin
    .from('branches')
    .select('id')
    .eq('name', BRANCH_B_NAME)
    .single();
  if (!branchA || !branchB) throw new Error('Seed branches not found - run npm run seed first.');

  const manager = await signInAs(BRANCH_MANAGER_EMAIL, BRANCH_MANAGER_PASSWORD);

  // --- Read scoping ---
  const { data: managerBranches, error: managerBranchesError } = await manager
    .from('branches')
    .select('name');
  if (managerBranchesError) throw managerBranchesError;
  const managerBranchNames = (managerBranches ?? []).map((b) => b.name);
  check(
    `branch_manager sees only "${BRANCH_A_NAME}"`,
    managerBranchNames.length === 1 && managerBranchNames[0] === BRANCH_A_NAME,
  );

  const { data: managerEmployees, error: managerEmployeesError } = await manager
    .from('employees')
    .select('full_name, primary_branch_id');
  if (managerEmployeesError) throw managerEmployeesError;
  check(
    `branch_manager cannot see employees outside "${BRANCH_A_NAME}"`,
    (managerEmployees ?? []).every((e) => e.full_name !== 'Employee (seed)'),
  );

  // --- Write scoping (Milestone 2 CRUD) ---
  const { error: managerCreateBranchError } = await manager
    .from('branches')
    .insert({ name: 'Should Not Be Created' });
  check(
    'branch_manager cannot create a branch (admin-only)',
    !!managerCreateBranchError,
  );

  const { error: managerCreateForeignEmployeeError } = await manager
    .from('employees')
    .insert({ full_name: 'Should Not Be Created', primary_branch_id: branchB.id });
  check(
    `branch_manager cannot create an employee in "${BRANCH_B_NAME}"`,
    !!managerCreateForeignEmployeeError,
  );

  const { data: insertedEmployee, error: managerCreateOwnEmployeeError } = await manager
    .from('employees')
    .insert({ full_name: 'RLS Check Temp Employee', primary_branch_id: branchA.id })
    .select('id')
    .single();
  check(
    `branch_manager can create an employee in "${BRANCH_A_NAME}"`,
    !managerCreateOwnEmployeeError && !!insertedEmployee,
  );
  if (insertedEmployee) {
    await admin.from('employees').delete().eq('id', insertedEmployee.id);
  }

  // --- Employee self-scoping ---
  const employee = await signInAs(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
  const { data: employeeBranches, error: employeeBranchesError } = await employee
    .from('branches')
    .select('name');
  if (employeeBranchesError) throw employeeBranchesError;
  const employeeBranchNames = (employeeBranches ?? []).map((b) => b.name);
  check(
    `employee cannot see "${BRANCH_A_NAME}" managed by someone else`,
    !employeeBranchNames.includes(BRANCH_A_NAME),
  );

  const { data: employeeOwnRow, error: employeeOwnRowError } = await employee
    .from('employees')
    .select('full_name');
  if (employeeOwnRowError) throw employeeOwnRowError;
  check(
    'employee sees exactly their own employee row',
    (employeeOwnRow ?? []).length === 1 && employeeOwnRow![0].full_name === 'Employee (seed)',
  );

  const { error: employeeCreateError } = await employee
    .from('employees')
    .insert({ full_name: 'Should Not Be Created', primary_branch_id: branchB.id });
  check('employee cannot create employee records', !!employeeCreateError);

  // --- Milestone 3: attendance & shifts ---
  const { data: managerEmployeeRow } = await admin
    .from('employees')
    .select('id')
    .eq('full_name', 'Branch Manager (seed)')
    .single();
  const { data: employeeEmployeeRow } = await admin
    .from('employees')
    .select('id')
    .eq('full_name', 'Employee (seed)')
    .single();
  if (!managerEmployeeRow || !employeeEmployeeRow) {
    throw new Error('Seed employees not found - run npm run seed first.');
  }

  const { error: employeeAppClockInError } = await employee
    .from('attendance_records')
    .insert({ employee_id: employeeEmployeeRow.id, branch_id: branchB.id, source: 'app' });
  check('employee can clock themselves in (source=app)', !employeeAppClockInError);
  await admin
    .from('attendance_records')
    .delete()
    .eq('employee_id', employeeEmployeeRow.id)
    .eq('source', 'app');

  const { error: employeeManualEntryError } = await employee.from('attendance_records').insert({
    employee_id: employeeEmployeeRow.id,
    branch_id: branchB.id,
    source: 'manual_entry',
    notes: 'attempt',
  });
  check('employee cannot create a manual_entry attendance record', !!employeeManualEntryError);

  const { error: managerManualForeignBranchError } = await manager
    .from('attendance_records')
    .insert({
      employee_id: employeeEmployeeRow.id,
      branch_id: branchB.id,
      source: 'manual_entry',
      notes: 'attempt',
    });
  check(
    `branch_manager cannot create a manual attendance record in "${BRANCH_B_NAME}"`,
    !!managerManualForeignBranchError,
  );

  const { data: managerManualOwnBranch, error: managerManualOwnBranchError } = await manager
    .from('attendance_records')
    .insert({
      employee_id: managerEmployeeRow.id,
      branch_id: branchA.id,
      source: 'manual_entry',
      notes: 'RLS check temp record',
    })
    .select('id, status')
    .single();
  check(
    `branch_manager can create a manual attendance record in "${BRANCH_A_NAME}" (status=pending)`,
    !managerManualOwnBranchError && managerManualOwnBranch?.status === 'pending',
  );
  if (managerManualOwnBranch) {
    await admin.from('attendance_records').delete().eq('id', managerManualOwnBranch.id);
  }

  const { error: managerShiftForeignBranchError } = await manager.from('shifts').insert({
    branch_id: branchB.id,
    employee_id: employeeEmployeeRow.id,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600_000).toISOString(),
    status: 'draft',
  });
  check(
    `branch_manager cannot create a shift in "${BRANCH_B_NAME}"`,
    !!managerShiftForeignBranchError,
  );

  const { data: managerOwnShift, error: managerShiftOwnBranchError } = await manager
    .from('shifts')
    .insert({
      branch_id: branchA.id,
      employee_id: managerEmployeeRow.id,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600_000).toISOString(),
      status: 'draft',
    })
    .select('id')
    .single();
  check(
    `branch_manager can create a shift in "${BRANCH_A_NAME}"`,
    !managerShiftOwnBranchError && !!managerOwnShift,
  );
  if (managerOwnShift) {
    await admin.from('shifts').delete().eq('id', managerOwnShift.id);
  }

  const { error: employeeShiftWriteError } = await employee.from('shifts').insert({
    branch_id: branchB.id,
    employee_id: employeeEmployeeRow.id,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600_000).toISOString(),
    status: 'draft',
  });
  check('employee cannot create shifts', !!employeeShiftWriteError);

  console.log(failures === 0 ? '\nAll RLS checks passed.' : `\n${failures} RLS check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('verify-rls failed:', err);
  process.exit(1);
});
