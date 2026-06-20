import { supabase } from '../../lib/supabaseClient';
import type { DocumentType, EmployeeDocument } from '../../types/domain';

const BUCKET = 'employee-documents';

export async function listDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('employee_id', employeeId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data as EmployeeDocument[];
}

export async function uploadDocument(params: {
  employeeId: string;
  type: DocumentType;
  file: File;
  uploadedBy: string;
}): Promise<EmployeeDocument> {
  const path = `documents/${params.employeeId}/${Date.now()}-${params.file.name}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, params.file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      employee_id: params.employeeId,
      type: params.type,
      file_path: path,
      uploaded_by: params.uploadedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EmployeeDocument;
}

export async function deleteDocument(doc: EmployeeDocument): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.file_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw error;
}

export async function getDocumentSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
