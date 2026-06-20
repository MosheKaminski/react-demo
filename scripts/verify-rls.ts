// Manually verifies branch-scoped RLS using the seeded test accounts.
// Run with: npm run verify-rls (after npm run seed).
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  BRANCH_A_NAME,
  BRANCH_MANAGER_EMAIL,
  BRANCH_MANAGER_PASSWORD,
  EMPLOYEE_EMAIL,
  EMPLOYEE_PASSWORD,
} from './fixtures';

config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
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
  const manager = await signInAs(BRANCH_MANAGER_EMAIL, BRANCH_MANAGER_PASSWORD);
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

  console.log(failures === 0 ? '\nAll RLS checks passed.' : `\n${failures} RLS check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('verify-rls failed:', err);
  process.exit(1);
});
