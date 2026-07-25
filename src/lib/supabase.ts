import { createClient } from '@supabase/supabase-js'

// These are public browser credentials, protected by Supabase Row Level Security.
// Environment values override the build-time defaults for previews and future projects.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://mmrpxjdwpvjqqasesltw.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_KnjNAxDr-oqiMy9RlunaiQ_V4Cai2Uh'

export const supabase = url && key ? createClient(url, key) : null
