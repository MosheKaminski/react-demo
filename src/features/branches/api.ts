import { supabase } from '../../lib/supabaseClient';
import type { Branch, BranchInput } from '../../types/domain';

export async function listBranches(): Promise<Branch[]> {
  const { data, error } = await supabase.from('branches').select('*').order('name');
  if (error) throw error;
  return data as Branch[];
}

export async function createBranch(input: BranchInput): Promise<Branch> {
  const { data, error } = await supabase.from('branches').insert(input).select().single();
  if (error) throw error;
  return data as Branch;
}

export async function updateBranch(id: string, input: Partial<BranchInput>): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Branch;
}

export async function setBranchActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('branches').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}
