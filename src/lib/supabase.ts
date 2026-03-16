import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Invitation = {
  id: string;
  last_name: string;
  invite_code: string;
  email: string | null;
  guests_allowed: number;
  plus_one_allowed: boolean;
  rsvp_status: 'pending' | 'attending' | 'declined';
  meal_choice: string | null;
  dietary_notes: string | null;
};