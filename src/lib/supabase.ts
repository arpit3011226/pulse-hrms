import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.')
}

// Using untyped client for now. Once connected to Supabase, run:
// npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
// Then add: createClient<Database>(...)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
