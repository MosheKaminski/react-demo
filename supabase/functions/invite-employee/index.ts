// Edge Function: invite-employee
// Creates a Supabase Auth account for an existing employee record and sends
// them an email invite to set their own password (PRD §2: only Admin
// assigns/creates login accounts). Admin-only.
//
// Uses the service role key to call the Auth Admin API
// (auth.admin.inviteUserByEmail), which must never be exposed to the
// browser - hence this runs server-side.
//
// Request body: { employeeId: string }
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Not authenticated' }, 401);
    }
    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
    if (callerProfile?.role !== 'admin') {
      return jsonResponse({ error: 'Only admins can invite users' }, 403);
    }

    const { employeeId } = await req.json();
    if (!employeeId) {
      return jsonResponse({ error: 'employeeId is required' }, 400);
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    const { data: employee, error: employeeError } = await db
      .from('employees')
      .select('id, email, full_name, user_id')
      .eq('id', employeeId)
      .single();
    if (employeeError || !employee) {
      return jsonResponse({ error: 'Employee not found' }, 404);
    }
    if (employee.user_id) {
      return jsonResponse({ error: 'This employee already has a linked account' }, 409);
    }
    if (!employee.email) {
      return jsonResponse({ error: 'Employee has no email address on file' }, 400);
    }

    const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(
      employee.email,
      { data: { full_name: employee.full_name } },
    );
    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400);
    }

    // The handle_new_user trigger already created a profile row defaulting
    // to role='employee'; just link the employee record to the new account.
    const { error: linkError } = await db
      .from('employees')
      .update({ user_id: invited.user.id })
      .eq('id', employeeId);
    if (linkError) {
      return jsonResponse({ error: linkError.message }, 500);
    }

    return jsonResponse({ userId: invited.user.id });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
