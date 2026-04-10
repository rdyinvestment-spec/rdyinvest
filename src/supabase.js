import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[RDY] Supabase credentials missing — running in offline mode. Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  // Mock client — all calls return a "not configured" error
  const notConfigured = () => Promise.resolve({ data: null, error: { message: 'Supabase não configurado. Adicione as credenciais no arquivo .env.' } });
  supabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: notConfigured,
      signInWithPassword: notConfigured,
      signOut: notConfigured,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: notConfigured, order: notConfigured }), order: notConfigured }),
      upsert: () => ({ select: notConfigured }),
      delete: () => ({ eq: notConfigured })
    })
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

/**
 * Authentication Helper
 */
export const auth = {
  async signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  }
};
