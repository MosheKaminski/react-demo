export type Role = 'admin' | 'branch_manager' | 'employee';

export interface Profile {
  id: string;
  role: Role;
}
