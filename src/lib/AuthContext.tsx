import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { queryClient } from './queryClient';
import type { Profile } from '../types/auth';
import { AuthContext } from './authContextDefinition';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Query results are cached by query key only, not by user, so a user
    // switch in the same tab (sign out + different sign in) must clear the
    // cache or the next user can briefly see the previous user's data.
    const handleUserChange = (userId: string | null) => {
      if (lastUserId.current !== userId) {
        queryClient.clear();
        lastUserId.current = userId;
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      handleUserChange(data.session?.user.id ?? null);
      if (data.session) {
        fetchProfile(data.session.user.id).then((p) => active && setProfile(p));
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      handleUserChange(newSession?.user.id ?? null);
      if (newSession) {
        fetchProfile(newSession.user.id).then((p) => active && setProfile(p));
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
