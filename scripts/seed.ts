// Seeds dev/test fixtures into the Supabase project: an admin user, two
// branches, a branch manager scoped to one of them, and a plain employee.
// Run with: npm run seed
// Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL,
// SEED_ADMIN_PASSWORD in .env.local (never committed).
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

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword) {
  throw new Error(
    'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_ADMIN_EMAIL, or SEED_ADMIN_PASSWORD in .env.local',
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertAuthUser(email: string, password: string): Promise<string> {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!createError) return created.user.id;
  if (!createError.message.toLowerCase().includes('already')) throw createError;

  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (!existing) throw new Error(`User ${email} reported as existing but could not be found`);
  return existing.id;
}

async function upsertBranch(name: string): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from('branches')
    .select('id')
    .eq('name', name)
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: inserted, error: insertError } = await supabase
    .from('branches')
    .insert({ name, address: 'Sample address', phone: '000-0000000' })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

async function upsertEmployee(params: {
  userId: string;
  fullName: string;
  primaryBranchId: string;
}): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', params.userId)
    .limit(1);
  if (lookupError) throw lookupError;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: inserted, error: insertError } = await supabase
    .from('employees')
    .insert({
      user_id: params.userId,
      full_name: params.fullName,
      primary_branch_id: params.primaryBranchId,
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return inserted.id;
}

async function main() {
  console.log(`Creating/finding admin user ${adminEmail}...`);
  const adminUserId = await upsertAuthUser(adminEmail!, adminPassword!);
  const { error: adminProfileError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', adminUserId);
  if (adminProfileError) throw adminProfileError;
  console.log('Promoted profile to admin role.');

  const branchAId = await upsertBranch(BRANCH_A_NAME);
  const branchBId = await upsertBranch(BRANCH_B_NAME);
  console.log(`Branches ready: "${BRANCH_A_NAME}" and "${BRANCH_B_NAME}".`);

  console.log(`Creating/finding branch manager user ${BRANCH_MANAGER_EMAIL}...`);
  const managerUserId = await upsertAuthUser(BRANCH_MANAGER_EMAIL, BRANCH_MANAGER_PASSWORD);
  const { error: managerProfileError } = await supabase
    .from('profiles')
    .update({ role: 'branch_manager' })
    .eq('id', managerUserId);
  if (managerProfileError) throw managerProfileError;
  const managerEmployeeId = await upsertEmployee({
    userId: managerUserId,
    fullName: 'Branch Manager (seed)',
    primaryBranchId: branchAId,
  });
  const { error: branchManagerLinkError } = await supabase
    .from('branches')
    .update({ manager_id: managerEmployeeId })
    .eq('id', branchAId);
  if (branchManagerLinkError) throw branchManagerLinkError;
  console.log(`Branch manager scoped to "${BRANCH_A_NAME}".`);

  console.log(`Creating/finding employee user ${EMPLOYEE_EMAIL}...`);
  const employeeUserId = await upsertAuthUser(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
  await upsertEmployee({
    userId: employeeUserId,
    fullName: 'Employee (seed)',
    primaryBranchId: branchBId,
  });
  console.log(`Employee scoped to "${BRANCH_B_NAME}".`);

  console.log('\nSeed complete. Test accounts:');
  console.log(`  admin:           ${adminEmail} / ${adminPassword}`);
  console.log(`  branch_manager:  ${BRANCH_MANAGER_EMAIL} / ${BRANCH_MANAGER_PASSWORD} (manages "${BRANCH_A_NAME}")`);
  console.log(`  employee:        ${EMPLOYEE_EMAIL} / ${EMPLOYEE_PASSWORD} (in "${BRANCH_B_NAME}")`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
