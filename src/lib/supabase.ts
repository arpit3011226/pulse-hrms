import { createClient } from '@supabase/supabase-js'

import { config } from './config'

const supabaseUrl = config.supabaseUrl
const supabaseAnonKey = config.supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.')
}

// Using untyped client for now. Once connected to Supabase, run:
// npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
// Then add: createClient<Database>(...)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
