import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '../types/auth';

export interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** True after following an invite/password-reset link, until the user
   * sets a new password. While true, the app should route to /set-password
   * instead of treating the session as a normal logged-in session. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
